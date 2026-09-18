import { Category, ClothingItem, SaleTransaction, StockValuation, MonthlyFinancialSummary } from '../types';
import { DEMO_CATEGORIES, DEMO_PRODUCTS, DEMO_SALES } from '../mockData';

const STORAGE_KEYS = {
  CATEGORIES: 'apparel_pos_categories_v2',
  PRODUCTS: 'apparel_pos_products_v2',
  SALES: 'apparel_pos_sales_v2',
  INITIALIZED_FLAG: 'apparel_pos_v2_initialized',
};

// Purge legacy sample data once on startup
const purgeSampleDataOnce = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED_FLAG)) {
        localStorage.removeItem('apparel_pos_categories_v1');
        localStorage.removeItem('apparel_pos_products_v1');
        localStorage.removeItem('apparel_pos_sales_v1');
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.INITIALIZED_FLAG, 'true');
      }
    }
  } catch (err) {
    console.error('Storage initialization error:', err);
  }
};

purgeSampleDataOnce();

export const getStoredCategories = (): Category[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read categories from storage:', err);
    return [];
  }
};

export const saveCategories = (categories: Category[]) => {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
};

export const getStoredProducts = (): ClothingItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read products from storage:', err);
    return [];
  }
};

export const saveProducts = (products: ClothingItem[]) => {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
};

export const getStoredSales = (): SaleTransaction[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SALES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read sales from storage:', err);
    return [];
  }
};

export const saveSales = (sales: SaleTransaction[]) => {
  localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
};

export const clearAllData = () => {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([]));
  localStorage.removeItem('apparel_pos_categories_v1');
  localStorage.removeItem('apparel_pos_products_v1');
  localStorage.removeItem('apparel_pos_sales_v1');
};

export const loadDemoData = () => {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEMO_CATEGORIES));
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEMO_PRODUCTS));
  localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(DEMO_SALES));
  return {
    categories: DEMO_CATEGORIES,
    products: DEMO_PRODUCTS,
    sales: DEMO_SALES,
  };
};

export const calculateStockValuation = (products: ClothingItem[]): StockValuation => {
  return products.reduce(
    (acc, item) => {
      const qty = Math.max(0, item.stockQuantity);
      acc.totalItems += 1;
      acc.totalQuantity += qty;
      acc.totalCostValue += qty * item.purchasePrice;
      acc.potentialWholesaleValue += qty * item.wholesalePrice;
      acc.potentialRetailValue += qty * item.retailPrice;

      if (qty === 0) {
        acc.outOfStockItemCount += 1;
      } else if (qty <= item.minStockThreshold) {
        acc.lowStockItemCount += 1;
      }

      acc.potentialGrossProfit = acc.potentialRetailValue - acc.totalCostValue;
      return acc;
    },
    {
      totalItems: 0,
      totalQuantity: 0,
      totalCostValue: 0,
      potentialWholesaleValue: 0,
      potentialRetailValue: 0,
      potentialGrossProfit: 0,
      lowStockItemCount: 0,
      outOfStockItemCount: 0,
    }
  );
};

export const formatCurrency = (amount: number): string => {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const isNegative = num < 0;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));

  return `${isNegative ? '-' : ''}Birr ${formatted}`;
};
