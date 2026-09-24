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
  addSaleTransactionDb,
  seedDefaultDataToDatabase
} from './lib/firebase';
import { Database, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredAuthUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Core state populated 100% directly from Cloud Firestore database
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ClothingItem[]>([]);
  const [sales, setSales] = useState<SaleTransaction[]>([]);

  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'categories' | 'reports'>('pos');
  const [salesType, setSalesType] = useState<SalesType>('retail');
  const [lastCompletedSale, setLastCompletedSale] = useState<SaleTransaction | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Subscribe to Cloud Firestore database in real-time
  useEffect(() => {
    setIsSyncing(true);
    setDbError(null);

    const unsubCat = subscribeCategories(
      (cloudCats) => {
        setCategories(cloudCats);
      },
      (err) => {
        console.error('Categories error from cloud db:', err);
        setDbError('Error synchronizing categories with database.');
      }
    );

    const unsubProd = subscribeProducts(
      (cloudProds) => {
        setProducts(cloudProds);
      },
      (err) => {
        console.error('Products error from cloud db:', err);
        setDbError('Error synchronizing products with database.');
      }
    );

    const unsubSales = subscribeSales(
      (cloudSales) => {
        setSales(cloudSales);
        setIsSyncing(false);
      },
      (err) => {
        console.error('Sales error from cloud db:', err);
        setDbError('Error synchronizing sales with database.');
        setIsSyncing(false);
      }
    );

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

  // Seed default demo catalog directly into Firestore Database
  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    try {
      await seedDefaultDataToDatabase();
      showToast('Default catalog & transactions seeded directly into Cloud Database!');
    } catch (err) {
      console.error('Seed database error:', err);
      showToast('Failed to seed database. Check database permissions.');
    } finally {
      setIsSeeding(false);
    }
  };

  // Complete a Sale Transaction & Store Directly in Cloud Firestore Database
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

    // 2. Persist directly to Firestore Database (no local storage used)
    try {
      setIsSyncing(true);
      await addSaleTransactionDb(sale, updatedProducts);
      setLastCompletedSale(sale);
      showToast(`Transaction ${sale.receiptNumber} successfully saved in Cloud Database!`);
    } catch (err) {
      console.error('Failed to sync sale to Firestore database:', err);
      showToast('Error saving transaction to database. Please check connection.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Product CRUD -> Stored directly in Firestore Database
  const handleAddProduct = async (itemData: Omit<ClothingItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: ClothingItem = {
      ...itemData,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      setIsSyncing(true);
      await addOrUpdateProductDb(newItem);
      showToast(`Saved "${newItem.name}" to Cloud Database.`);
    } catch (err) {
      console.error('Failed to save product to database:', err);
      showToast('Error saving product to database.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateProduct = async (updatedItem: ClothingItem) => {
    try {
      setIsSyncing(true);
      await addOrUpdateProductDb(updatedItem);
      showToast(`Updated "${updatedItem.name}" in Cloud Database.`);
    } catch (err) {
      console.error('Failed to update product in database:', err);
      showToast('Error updating product in database.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      setIsSyncing(true);
      await deleteProductDb(productId);
      showToast('Item deleted from Cloud Database.');
    } catch (err) {
      console.error('Failed to delete product from database:', err);
      showToast('Error deleting item from database.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleQuickAdjustStock = async (productId: string, delta: number, reason: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const updatedProduct: ClothingItem = {
      ...prod,
      stockQuantity: Math.max(0, prod.stockQuantity + delta),
      updatedAt: new Date().toISOString(),
    };

    try {
      setIsSyncing(true);
      await addOrUpdateProductDb(updatedProduct);
      showToast(`Stock updated in Cloud Database (${delta > 0 ? `+${delta}` : delta} units) - ${reason}.`);
    } catch (err) {
      console.error('Failed to update stock in database:', err);
      showToast('Error updating stock in database.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Category CRUD -> Stored directly in Firestore Database
  const handleAddCategory = async (catData: Omit<Category, 'id'>) => {
    const newCat: Category = {
      ...catData,
      id: `cat-${Date.now()}`,
    };

    try {
      setIsSyncing(true);
      await addOrUpdateCategoryDb(newCat);
      showToast(`Category "${newCat.name}" saved to Cloud Database.`);
    } catch (err) {
      console.error('Failed to save category in database:', err);
      showToast('Error saving category to database.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateCategory = async (updatedCat: Category) => {
    try {
      setIsSyncing(true);
      await addOrUpdateCategoryDb(updatedCat);
      showToast(`Category "${updatedCat.name}" updated in Cloud Database.`);
    } catch (err) {
      console.error('Failed to update category in database:', err);
      showToast('Error updating category in database.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      setIsSyncing(true);
      await deleteCategoryDb(categoryId);
      showToast('Category removed from Cloud Database.');
    } catch (err) {
      console.error('Failed to delete category from database:', err);
      showToast('Error deleting category from database.');
    } finally {
      setIsSyncing(false);
    }
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

  const isDatabaseEmpty = !isSyncing && categories.length === 0 && products.length === 0;

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
        productCount={products.length}
        salesCount={sales.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Cloud Database Error Banner */}
        {dbError && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{dbError}</span>
          </div>
        )}

        {/* Database Empty Banner with 1-click database seed */}
        {isDatabaseEmpty && (
          <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white shrink-0 shadow-sm shadow-indigo-600/20">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  Cloud Firestore Database Connected
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                    Live
                  </span>
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Your cloud database is connected and ready. You can populate standard apparel categories and sample inventory directly into the database with one click.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSeedDatabase}
              disabled={isSeeding}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-all whitespace-nowrap cursor-pointer shrink-0"
            >
              {isSeeding ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>{isSeeding ? 'Writing to Database...' : 'Populate Database Catalog'}</span>
            </button>
          </div>
        )}

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
