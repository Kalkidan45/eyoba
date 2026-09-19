import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { POSModule } from './components/POSModule';
import { InventoryModule } from './components/InventoryModule';
import { CategoryModule } from './components/CategoryModule';
import { ReportsModule } from './components/ReportsModule';
import { ReceiptModal } from './components/ReceiptModal';
import { AuthModal } from './components/AuthModal';
import { 
  Category, 
  ClothingItem, 
  SaleTransaction, 
  SalesType,
  AuthUser 
} from './types';
import { 
  getStoredCategories, 
  saveCategories, 
  getStoredProducts, 
  saveProducts, 
  getStoredSales, 
  saveSales 
} from './utils/storage';
import { 
  getStoredAuthUser,
  logoutStaticUser
} from './lib/auth';
import { 
  subscribeCategories,
  subscribeProducts,
  subscribeSales,
  addOrUpdateCategoryDb,
  deleteCategoryDb,
  addOrUpdateProductDb,
  deleteProductDb,
  addSaleTransactionDb
} from './lib/firebase';
import { Lock, Store, Database, ShieldCheck, ArrowRight, KeyRound } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredAuthUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);

  const [categories, setCategories] = useState<Category[]>(() => getStoredCategories());
  const [products, setProducts] = useState<ClothingItem[]>(() => getStoredProducts());
  const [sales, setSales] = useState<SaleTransaction[]>(() => getStoredSales());

  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'categories' | 'reports'>('pos');
  const [salesType, setSalesType] = useState<SalesType>('retail');
  const [lastCompletedSale, setLastCompletedSale] = useState<SaleTransaction | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Subscribe to Cloud Firestore database in real-time
  useEffect(() => {
    setIsSyncing(true);

    const unsubCat = subscribeCategories((cloudCats) => {
      setCategories(cloudCats);
      saveCategories(cloudCats);
    });

    const unsubProd = subscribeProducts((cloudProds) => {
      setProducts(cloudProds);
      saveProducts(cloudProds);
    });

    const unsubSales = subscribeSales((cloudSales) => {
      setSales(cloudSales);
      saveSales(cloudSales);
      setIsSyncing(false);
    });

    return () => {
      unsubCat();
      unsubProd();
      unsubSales();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Stock Alerts Count
  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stockQuantity <= p.minStockThreshold).length;
  }, [products]);

  // Complete a Sale Transaction & Automatically Store in Cloud Firestore Database
  const handleCompleteSale = async (sale: SaleTransaction) => {
    // 1. Calculate deducted stock items
    const updatedProducts = products.map((prod) => {
      const soldItem = sale.items.find((it) => it.productId === prod.id);
      if (soldItem) {
        return {
          ...prod,
          stockQuantity: Math.max(0, prod.stockQuantity - soldItem.quantity),
          updatedAt: new Date().toISOString(),
        };
      }
      return prod;
    });

    // Optimistic UI updates
    setProducts(updatedProducts);
    saveProducts(updatedProducts);

    const updatedSales = [sale, ...sales];
    setSales(updatedSales);
    saveSales(updatedSales);

    // Persist directly to Firestore Database
    try {
      await addSaleTransactionDb(sale, updatedProducts);
    } catch (err) {
      console.error('Failed to sync sale to Firestore database:', err);
    }

    // Open receipt modal & notify user
    setLastCompletedSale(sale);
    showToast(`Sale ${sale.receiptNumber} recorded & stored in database!`);
  };

  // Product CRUD -> Stored directly in Firestore Database
  const handleAddProduct = async (itemData: Omit<ClothingItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: ClothingItem = {
      ...itemData,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newItem, ...products];
    setProducts(updated);
    saveProducts(updated);

    try {
      await addOrUpdateProductDb(newItem);
    } catch (err) {
      console.error('Failed to save product to database:', err);
    }

    showToast(`Saved "${newItem.name}" to cloud database.`);
  };

  const handleUpdateProduct = async (updatedItem: ClothingItem) => {
    const updated = products.map((p) => (p.id === updatedItem.id ? updatedItem : p));
    setProducts(updated);
    saveProducts(updated);

    try {
      await addOrUpdateProductDb(updatedItem);
    } catch (err) {
      console.error('Failed to update product in database:', err);
    }

    showToast(`Updated "${updatedItem.name}" in database.`);
  };

  const handleDeleteProduct = async (productId: string) => {
    const updated = products.filter((p) => p.id !== productId);
    setProducts(updated);
    saveProducts(updated);

    try {
      await deleteProductDb(productId);
    } catch (err) {
      console.error('Failed to delete product from database:', err);
    }

    showToast('Item deleted from database.');
  };

  const handleQuickAdjustStock = async (productId: string, delta: number, reason: string) => {
    let targetProduct: ClothingItem | null = null;
    const updated = products.map((p) => {
      if (p.id === productId) {
        targetProduct = {
          ...p,
          stockQuantity: Math.max(0, p.stockQuantity + delta),
          updatedAt: new Date().toISOString(),
        };
        return targetProduct;
      }
      return p;
    });

    setProducts(updated);
    saveProducts(updated);

    if (targetProduct) {
      try {
        await addOrUpdateProductDb(targetProduct);
      } catch (err) {
        console.error('Failed to update stock in database:', err);
      }
    }

    showToast(`Stock updated (${delta > 0 ? `+${delta}` : delta} units) - ${reason}.`);
  };

  // Category CRUD -> Stored directly in Firestore Database
  const handleAddCategory = async (catData: Omit<Category, 'id'>) => {
    const newCat: Category = {
      ...catData,
      id: `cat-${Date.now()}`,
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    saveCategories(updated);

    try {
      await addOrUpdateCategoryDb(newCat);
    } catch (err) {
      console.error('Failed to save category in database:', err);
    }

    showToast(`Category "${newCat.name}" saved to database.`);
  };

  const handleUpdateCategory = async (updatedCat: Category) => {
    const updated = categories.map((c) => (c.id === updatedCat.id ? updatedCat : c));
    setCategories(updated);
    saveCategories(updated);

    try {
      await addOrUpdateCategoryDb(updatedCat);
    } catch (err) {
      console.error('Failed to update category in database:', err);
    }

    showToast(`Category "${updatedCat.name}" updated in database.`);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const updated = categories.filter((c) => c.id !== categoryId);
    setCategories(updated);
    saveCategories(updated);

    try {
      await deleteCategoryDb(categoryId);
    } catch (err) {
      console.error('Failed to delete category from database:', err);
    }

    showToast('Category removed from database.');
  };

  const handleLogout = () => {
    logoutStaticUser();
    setUser(null);
    showToast('Signed out of terminal.');
  };

  // If user is not logged in, present the clean static login gatekeeper
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <AuthModal
          isOpen={true}
          canDismiss={false}
          onSuccess={(authUser) => {
            setUser(authUser);
            showToast(`Welcome, ${authUser.displayName}!`);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        salesType={salesType}
        setSalesType={setSalesType}
        lowStockCount={lowStockCount}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        isSyncing={isSyncing}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Toast Notification Banner */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-800 text-xs font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tab View Switching */}
        {activeTab === 'pos' && (
          <POSModule
            products={products}
            categories={categories}
            salesType={salesType}
            setSalesType={setSalesType}
            onCompleteSale={handleCompleteSale}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryModule
            products={products}
            categories={categories}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onQuickAdjustStock={handleQuickAdjustStock}
          />
        )}

        {activeTab === 'categories' && (
          <CategoryModule
            categories={categories}
            products={products}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsModule
            sales={sales}
            products={products}
            categories={categories}
          />
        )}
      </main>

      {/* Receipt Modal triggered upon completing a sale */}
      <ReceiptModal
        sale={lastCompletedSale}
        onClose={() => setLastCompletedSale(null)}
        onNewSale={() => {
          setLastCompletedSale(null);
          setActiveTab('pos');
        }}
      />

      {/* Switch User Modal (if opened via Navbar) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        canDismiss={true}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(authUser) => {
          setUser(authUser);
          setIsAuthModalOpen(false);
          showToast(`Logged in as ${authUser.displayName}`);
        }}
      />
    </div>
  );
}
