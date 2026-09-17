import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { POSModule } from './components/POSModule';
import { InventoryModule } from './components/InventoryModule';
import { CategoryModule } from './components/CategoryModule';
import { ReportsModule } from './components/ReportsModule';
import { ReceiptModal } from './components/ReceiptModal';
import { 
  Category, 
  ClothingItem, 
  SaleTransaction, 
  SalesType 
} from './types';
import { 
  getStoredCategories, 
  saveCategories, 
  getStoredProducts, 
  saveProducts, 
  getStoredSales, 
  saveSales 
} from './utils/storage';

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ClothingItem[]>([]);
  const [sales, setSales] = useState<SaleTransaction[]>([]);

  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'categories' | 'reports'>('pos');
  const [salesType, setSalesType] = useState<SalesType>('retail');
  const [lastCompletedSale, setLastCompletedSale] = useState<SaleTransaction | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initialize data from local storage
  useEffect(() => {
    setCategories(getStoredCategories());
    setProducts(getStoredProducts());
    setSales(getStoredSales());
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Stock Alerts Count
  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stockQuantity <= p.minStockThreshold).length;
  }, [products]);

  // Complete a Sale Transaction & Automatically Deduct Stock
  const handleCompleteSale = (sale: SaleTransaction) => {
    // 1. Deduct sold quantities from stock
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

    setProducts(updatedProducts);
    saveProducts(updatedProducts);

    // 2. Persist new sale record
    const updatedSales = [sale, ...sales];
    setSales(updatedSales);
    saveSales(updatedSales);

    // 3. Open receipt modal & notify user
    setLastCompletedSale(sale);
    showToast(`Sale ${sale.receiptNumber} completed! Stock automatically deducted.`);
  };

  // Product CRUD
  const handleAddProduct = (itemData: Omit<ClothingItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem: ClothingItem = {
      ...itemData,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newItem, ...products];
    setProducts(updated);
    saveProducts(updated);
    showToast(`Added "${newItem.name}" to inventory.`);
  };

  const handleUpdateProduct = (updatedItem: ClothingItem) => {
    const updated = products.map((p) => (p.id === updatedItem.id ? updatedItem : p));
    setProducts(updated);
    saveProducts(updated);
    showToast(`Updated "${updatedItem.name}".`);
  };

  const handleDeleteProduct = (productId: string) => {
    const updated = products.filter((p) => p.id !== productId);
    setProducts(updated);
    saveProducts(updated);
    showToast('Item deleted from inventory.');
  };

  const handleQuickAdjustStock = (productId: string, delta: number, reason: string) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        return {
          ...p,
          stockQuantity: Math.max(0, p.stockQuantity + delta),
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    setProducts(updated);
    saveProducts(updated);
    showToast(`Stock updated (${delta > 0 ? `+${delta}` : delta} units) - ${reason}.`);
  };

  // Category CRUD
  const handleAddCategory = (catData: Omit<Category, 'id'>) => {
    const newCat: Category = {
      ...catData,
      id: `cat-${Date.now()}`,
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    saveCategories(updated);
    showToast(`Category "${newCat.name}" created.`);
  };

  const handleUpdateCategory = (updatedCat: Category) => {
    const updated = categories.map((c) => (c.id === updatedCat.id ? updatedCat : c));
    setCategories(updated);
    saveCategories(updated);
    showToast(`Category "${updatedCat.name}" updated.`);
  };

  const handleDeleteCategory = (categoryId: string) => {
    const updated = categories.filter((c) => c.id !== categoryId);
    setCategories(updated);
    saveCategories(updated);
    showToast('Category removed.');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        salesType={salesType}
        setSalesType={setSalesType}
        lowStockCount={lowStockCount}
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
    </div>
  );
}
