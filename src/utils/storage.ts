import { Category, ClothingItem, SaleTransaction, StockValuation, MonthlyFinancialSummary } from '../types';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_SALES } from '../mockData';

const STORAGE_KEYS = {
  CATEGORIES: 'apparel_pos_categories_v1',
  PRODUCTS: 'apparel_pos_products_v1',
  SALES: 'apparel_pos_sales_v1',
};

export const getStoredCategories = (): Category[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
      return INITIAL_CATEGORIES;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read categories from storage:', err);
    return INITIAL_CATEGORIES;
  }
};

export const saveCategories = (categories: Category[]) => {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
};

export const getStoredProducts = (): ClothingItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read products from storage:', err);
    return INITIAL_PRODUCTS;
  }
};

export const saveProducts = (products: ClothingItem[]) => {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
};

export const getStoredSales = (): SaleTransaction[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SALES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(INITIAL_SALES));
      return INITIAL_SALES;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read sales from storage:', err);
    return INITIAL_SALES;
  }
};

export const saveSales = (sales: SaleTransaction[]) => {
  localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
};

export const resetToDemoData = () => {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
  localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(INITIAL_SALES));
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
