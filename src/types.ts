export type SalesType = 'retail' | 'wholesale';

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'credit_terms';

export interface Category {
  id: string;
  name: string;
  code: string;
  description: string;
  colorBadge: string; // Tailwind color theme identifier
}

export interface ClothingItem {
  id: string;
  name: string;
  categoryId: string;
  sku: string;
  barcode: string;
  size: string; // e.g., 'XS', 'S', 'M', 'L', 'XL', '2XL', '32x32'
  color: string; // e.g., 'Midnight Navy', 'Onyx Black', 'Stone Khaki'
  colorHex?: string;
  purchasePrice: number; // Cost of Goods Sold (COGS) base
  wholesalePrice: number; // Bulk / B2B sales price
  retailPrice: number; // Direct consumer / storefront price
  stockQuantity: number; // In-stock unit balance
  minStockThreshold: number; // Alert threshold for reordering
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: ClothingItem;
  quantity: number;
  appliedPrice: number; // Dynamically selected based on salesType
  unitCost: number; // Purchase price snapshot
  subtotal: number;
}

export interface SaleItemRecord {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  categoryId: string;
  size: string;
  color: string;
  quantity: number;
  unitCost: number; // Historic cost snapshot
  unitPrice: number; // Historic sale price snapshot
  subtotal: number; // quantity * unitPrice
  totalCost: number; // quantity * unitCost
}

export interface SaleTransaction {
  id: string;
  receiptNumber: string;
  salesType: SalesType;
  customerName: string;
  customerPhone?: string;
  customerCompany?: string; // For wholesale accounts
  items: SaleItemRecord[];
  subtotal: number;
  discount: number;
  tax: number;
  totalRevenue: number;
  totalCOGS: number;
  netProfit: number;
  profitMargin: number; // Percentage
  paymentMethod: PaymentMethod;
  amountTendered?: number;
  changeDue?: number;
  timestamp: string; // ISO date
  notes?: string;
}

export interface MonthlyFinancialSummary {
  monthKey: string; // e.g. "2026-09"
  monthLabel: string;
  totalRevenue: number;
  totalCOGS: number;
  netProfit: number;
  grossMarginPercent: number;
  totalUnitsSold: number;
  totalTransactions: number;
  averageOrderValue: number;
  wholesaleRevenue: number;
  retailRevenue: number;
  wholesaleProfit: number;
  retailProfit: number;
  wholesaleUnits: number;
  retailUnits: number;
}

export interface StockValuation {
  totalItems: number;
  totalQuantity: number;
  totalCostValue: number; // Valuation at cost (COGS asset)
  potentialWholesaleValue: number;
  potentialRetailValue: number;
  potentialGrossProfit: number;
  lowStockItemCount: number;
  outOfStockItemCount: number;
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'manager' | 'cashier';
  storeName?: string;
  loginTime: string;
}
