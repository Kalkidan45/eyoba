import { ClothingItem, StockValuation } from '../types';

/**
 * Clean up and purge any legacy local storage data keys
 * to ensure that all business records (products, categories, sales)
 * are stored exclusively in the Cloud Firestore database.
 */
export const purgeAllLocalStorageRecords = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove = [
        'apparel_pos_categories_v2',
        'apparel_pos_products_v2',
        'apparel_pos_sales_v2',
        'apparel_pos_categories_v1',
        'apparel_pos_products_v1',
        'apparel_pos_sales_v1',
        'apparel_pos_v2_initialized',
        'apparel_pos_v1_initialized',
        'apparel_pos_categories',
        'apparel_pos_products',
        'apparel_pos_sales',
      ];
      keysToRemove.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {
          // Ignore
        }
      });
    }
  } catch (err) {
    console.error('Purge legacy storage notice:', err);
  }
};

// Execute purge immediately on bundle load
purgeAllLocalStorageRecords();

/**
 * Pure calculation utilities for stock valuation and currency formatting
 */
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
