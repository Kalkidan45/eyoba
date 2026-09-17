import React, { useState, useMemo } from 'react';
import { ClothingItem, Category, CartItem, SalesType, PaymentMethod, SaleTransaction, SaleItemRecord } from '../types';
import { formatCurrency } from '../utils/storage';

interface POSModuleProps {
  products: ClothingItem[];
  categories: Category[];
  salesType: SalesType;
  setSalesType: (type: SalesType) => void;
  onCompleteSale: (sale: SaleTransaction) => void;
}

export const POSModule: React.FC<POSModuleProps> = ({
  products,
  categories,
  salesType,
  setSalesType,
  onCompleteSale,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  
  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [checkoutNotes, setCheckoutNotes] = useState('');

  // Dynamically compute the unit price for an item based on current salesType
  const getDynamicPrice = (item: ClothingItem, type: SalesType): number => {
    return type === 'wholesale' ? item.wholesalePrice : item.retailPrice;
  };

  // Sync cart item prices when salesType changes
  const activeCart = useMemo(() => {
    return cart.map((ci) => {
      const currentPrice = getDynamicPrice(ci.product, salesType);
      return {
        ...ci,
        appliedPrice: currentPrice,
        subtotal: ci.quantity * currentPrice,
      };
    });
  }, [cart, salesType]);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesCategory = selectedCategoryId === 'all' || item.categoryId === selectedCategoryId;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = 
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.barcode.includes(q) ||
        item.color.toLowerCase().includes(q) ||
        item.size.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [products, selectedCategoryId, searchQuery]);

  // Add to cart handler
  const handleAddToCart = (item: ClothingItem) => {
    if (item.stockQuantity <= 0) return;

    setCart((prev) => {
      const existing = prev.find((ci) => ci.product.id === item.id);
      if (existing) {
        if (existing.quantity >= item.stockQuantity) {
          alert(`Cannot add more than ${item.stockQuantity} units of ${item.name} (${item.size}) in stock.`);
          return prev;
        }
        return prev.map((ci) =>
          ci.product.id === item.id
            ? {
                ...ci,
                quantity: ci.quantity + 1,
                subtotal: (ci.quantity + 1) * getDynamicPrice(item, salesType),
              }
            : ci
        );
      } else {
        const unitPrice = getDynamicPrice(item, salesType);
        return [
          ...prev,
          {
            product: item,
            quantity: 1,
            appliedPrice: unitPrice,
            unitCost: item.purchasePrice,
            subtotal: unitPrice,
          },
        ];
      }
    });
  };

  // Update quantity in cart
  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((ci) => {
          if (ci.product.id === productId) {
            const nextQty = ci.quantity + delta;
            if (nextQty > ci.product.stockQuantity) {
              alert(`Maximum available stock is ${ci.product.stockQuantity} units.`);
              return ci;
            }
            if (nextQty <= 0) return null;
            return {
              ...ci,
              quantity: nextQty,
              subtotal: nextQty * getDynamicPrice(ci.product, salesType),
            };
          }
          return ci;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((ci) => ci.product.id !== productId));
  };

  const handleClearCart = () => {
    if (cart.length > 0 && window.confirm('Clear all items from current cart?')) {
      setCart([]);
    }
  };

  // Quick simulate barcode scan action
  const handleSimulateBarcodeScan = (barcode: string) => {
    const item = products.find((p) => p.barcode === barcode || p.sku === barcode);
    if (item) {
      handleAddToCart(item);
      setSearchQuery('');
    } else {
      alert(`Barcode ${barcode} not found in inventory.`);
    }
  };

  // Calculations
  const cartSubtotal = useMemo(() => {
    return activeCart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [activeCart]);

  const discountAmount = useMemo(() => {
    return (cartSubtotal * discountPercent) / 100;
  }, [cartSubtotal, discountPercent]);

  // Tax rate: 8% on Retail, 0% on Wholesale (B2B tax-exempt resale certificates standard)
  const taxRate = salesType === 'wholesale' ? 0 : 0.08;
  const taxAmount = useMemo(() => {
    return (cartSubtotal - discountAmount) * taxRate;
  }, [cartSubtotal, discountAmount, taxRate]);

  const totalDue = useMemo(() => {
    return Math.max(0, cartSubtotal - discountAmount + taxAmount);
  }, [cartSubtotal, discountAmount, taxAmount]);

  const totalCartCost = useMemo(() => {
    return activeCart.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  }, [activeCart]);

  const projectedNetProfit = useMemo(() => {
    return (cartSubtotal - discountAmount) - totalCartCost;
  }, [cartSubtotal, discountAmount, totalCartCost]);

  const totalUnits = useMemo(() => {
    return activeCart.reduce((sum, item) => sum + item.quantity, 0);
  }, [activeCart]);

  // Execute Sale checkout & stock deduction
  const handleFinalizeCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeCart.length === 0) return;

    const receiptNum = `REC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const saleItems: SaleItemRecord[] = activeCart.map((ci) => ({
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId: ci.product.id,
      productName: ci.product.name,
      sku: ci.product.sku,
      categoryId: ci.product.categoryId,
      size: ci.product.size,
      color: ci.product.color,
      quantity: ci.quantity,
      unitCost: ci.product.purchasePrice,
      unitPrice: ci.appliedPrice,
      subtotal: ci.subtotal,
      totalCost: ci.quantity * ci.product.purchasePrice,
    }));

    const tenderedNum = paymentMethod === 'cash' ? parseFloat(cashTendered) || totalDue : totalDue;
    const changeAmount = Math.max(0, tenderedNum - totalDue);

    const saleRecord: SaleTransaction = {
      id: `sale-${Date.now()}`,
      receiptNumber: receiptNum,
      salesType,
      customerName: customerName.trim() || (salesType === 'wholesale' ? 'Wholesale Partner' : 'Walk-in Customer'),
      customerCompany: customerCompany.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      items: saleItems,
      subtotal: cartSubtotal,
      discount: discountAmount,
      tax: taxAmount,
      totalRevenue: totalDue,
      totalCOGS: totalCartCost,
      netProfit: projectedNetProfit,
      profitMargin: totalDue > 0 ? (projectedNetProfit / totalDue) * 100 : 0,
      paymentMethod,
      amountTendered: paymentMethod === 'cash' ? tenderedNum : undefined,
      changeDue: paymentMethod === 'cash' ? changeAmount : undefined,
      timestamp: new Date().toISOString(),
      notes: checkoutNotes.trim() || undefined,
    };

    onCompleteSale(saleRecord);

    // Reset checkout form & cart
    setCart([]);
    setIsCheckoutOpen(false);
    setCustomerName('');
    setCustomerCompany('');
    setCustomerPhone('');
    setCashTendered('');
    setCheckoutNotes('');
    setDiscountPercent(0);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Sales Mode Control Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-900">Active Register & Checkout</h2>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  salesType === 'wholesale'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                }`}
              >
                {salesType === 'wholesale' ? 'Wholesale Mode (B2B Rates)' : 'Retail Mode (MSRP)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {salesType === 'wholesale'
                ? 'Applying tiered wholesale pricing. Tax-exempt resale rules active by default.'
                : 'Applying direct customer retail pricing with 8% sales tax calculation.'}
            </p>
          </div>

          {/* Sales Type Toggle Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 self-start md:self-auto">
            <button
              id="toggle-sales-retail"
              type="button"
              onClick={() => setSalesType('retail')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                salesType === 'retail'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Retail Sale
            </button>
            <button
              id="toggle-sales-wholesale"
              type="button"
              onClick={() => setSalesType('wholesale')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                salesType === 'wholesale'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Wholesale (B2B)
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Catalog Left (7 cols) + Live Cart Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Search, Categories & Clothing Catalog */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Barcode Quick Scanner Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2.5">
            <div className="relative">
              <input
                id="input-product-search"
                type="text"
                placeholder="Scan barcode, enter SKU, product name, or color..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  Barcode Scanner Active
                </span>
              </div>
            </div>

            {/* Quick Demo Scanner Shortcuts */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs text-slate-500">
              <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                Quick Scan:
              </span>
              <button
                type="button"
                onClick={() => handleSimulateBarcodeScan('8901001001')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded border border-slate-200 font-mono text-[11px] whitespace-nowrap transition-colors"
                title="Scan Crewneck Tee M"
              >
                Scan Tee M [8901001001]
              </button>
              <button
                type="button"
                onClick={() => handleSimulateBarcodeScan('8902002001')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded border border-slate-200 font-mono text-[11px] whitespace-nowrap transition-colors"
                title="Scan Denim Overshirt L"
              >
                Scan Denim L [8902002001]
              </button>
              <button
                type="button"
                onClick={() => handleSimulateBarcodeScan('8903003001')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded border border-slate-200 font-mono text-[11px] whitespace-nowrap transition-colors"
                title="Scan Chino Trousers 32x32"
              >
                Scan Chinos [8903003001]
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategoryId === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              All Items ({products.length})
            </button>
            {categories.map((cat) => {
              const count = products.filter((p) => p.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategoryId === cat.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredProducts.length === 0 ? (
              <div className="col-span-2 py-12 text-center bg-white rounded-xl border border-slate-200 p-6">
                <p className="text-sm font-semibold text-slate-700">No clothing items found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Try adjusting your search filter or category selection.
                </p>
              </div>
            ) : (
              filteredProducts.map((product) => {
                const category = categories.find((c) => c.id === product.categoryId);
                const activePrice = getDynamicPrice(product, salesType);
                const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= product.minStockThreshold;
                const isOutOfStock = product.stockQuantity <= 0;

                return (
                  <div
                    key={product.id}
                    id={`product-card-${product.id}`}
                    className={`bg-white rounded-xl border p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between ${
                      isOutOfStock
                        ? 'border-slate-200 opacity-60 bg-slate-50/50'
                        : isLowStock
                        ? 'border-amber-300 ring-1 ring-amber-200'
                        : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div>
                      {/* Card Header: Category & Stock Pill */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider truncate">
                          {category?.name || 'Apparel'}
                        </span>
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                            Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Low: {product.stockQuantity} left
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
                            {product.stockQuantity} in stock
                          </span>
                        )}
                      </div>

                      {/* Product Name */}
                      <h4 className="font-semibold text-sm text-slate-900 line-clamp-1 mb-1.5" title={product.name}>
                        {product.name}
                      </h4>

                      {/* Attributes: Size, Color, SKU */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 mb-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-800 text-[11px]">
                          Size: {product.size}
                        </span>
                        <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-100 text-[11px]">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-slate-300 inline-block"
                            style={{ backgroundColor: product.colorHex || '#94a3b8' }}
                          />
                          <span>{product.color}</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {product.sku}
                        </span>
                      </div>
                    </div>

                    {/* Pricing & Add to Cart Action */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="flex items-baseline space-x-1.5">
                          <span className="text-base font-bold text-slate-900">
                            {formatCurrency(activePrice)}
                          </span>
                          <span className="text-[10px] uppercase font-semibold text-indigo-600">
                            {salesType}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {salesType === 'retail' ? (
                            <span>Wholesale: {formatCurrency(product.wholesalePrice)}</span>
                          ) : (
                            <span>MSRP Retail: {formatCurrency(product.retailPrice)}</span>
                          )}
                        </div>
                      </div>

                      <button
                        id={`btn-add-cart-${product.id}`}
                        type="button"
                        onClick={() => handleAddToCart(product)}
                        disabled={isOutOfStock}
                        className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          isOutOfStock
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow-sm active:scale-95'
                        }`}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Cart & Checkout Panel */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-5 sticky top-20 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-base text-slate-900">Cart & Order Summary</h3>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium transition-colors"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Cart Pricing Mode Indicator */}
          <div
            className={`p-2.5 rounded-lg text-xs flex items-center justify-between ${
              salesType === 'wholesale'
                ? 'bg-purple-50 text-purple-900 border border-purple-200'
                : 'bg-indigo-50 text-indigo-900 border border-indigo-200'
            }`}
          >
            <span>
              Rates: <strong>{salesType.toUpperCase()}</strong> (Auto-applied)
            </span>
            <span className="font-semibold text-[11px]">
              {totalUnits} units
            </span>
          </div>

          {/* Cart Items List */}
          <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 divide-y divide-slate-100">
            {activeCart.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <p className="text-sm font-medium text-slate-600">Cart is empty</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select items from catalog or scan barcode to begin.
                </p>
              </div>
            ) : (
              activeCart.map((ci) => (
                <div key={ci.product.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs text-slate-900 truncate">
                      {ci.product.name}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                      <span>Size: <strong>{ci.product.size}</strong></span>
                      <span>•</span>
                      <span>{ci.product.color}</span>
                    </div>
                    <div className="text-[11px] text-indigo-700 font-medium">
                      {formatCurrency(ci.appliedPrice)} each
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(ci.product.id, -1)}
                      className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold transition-colors"
                      title="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-bold text-xs text-slate-900">
                      {ci.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(ci.product.id, 1)}
                      className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold transition-colors"
                      title="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  {/* Line Subtotal & Remove */}
                  <div className="text-right min-w-[60px]">
                    <div className="font-bold text-xs text-slate-900">
                      {formatCurrency(ci.subtotal)}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(ci.product.id)}
                      className="text-slate-400 hover:text-rose-600 text-[11px] font-medium transition-colors"
                      title="Remove item"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Financial Breakdown */}
          {activeCart.length > 0 && (
            <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium text-slate-900">{formatCurrency(cartSubtotal)}</span>
              </div>

              {/* Discount Selector */}
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-600 font-medium">
                  Discount
                </span>
                <div className="flex items-center space-x-1">
                  {[0, 5, 10, 15].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDiscountPercent(pct)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                        discountPercent === pct
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                  {discountAmount > 0 && (
                    <span className="text-emerald-600 font-semibold ml-1">
                      -{formatCurrency(discountAmount)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>
                  Sales Tax {salesType === 'wholesale' ? '(B2B Exempt)' : '(8%)'}
                </span>
                <span className="font-medium text-slate-900">{formatCurrency(taxAmount)}</span>
              </div>

              {/* COGS & Profit Live Preview */}
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px] space-y-0.5">
                <div className="flex justify-between text-slate-500">
                  <span>Cost of Goods (COGS):</span>
                  <span>{formatCurrency(totalCartCost)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Est. Net Profit:</span>
                  <span>
                    {formatCurrency(projectedNetProfit)} (
                    {totalDue > 0 ? ((projectedNetProfit / totalDue) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>

              {/* Final Amount Due */}
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                <span className="text-sm font-bold text-slate-900">Total Amount Due</span>
                <span className="text-xl font-extrabold text-indigo-700">
                  {formatCurrency(totalDue)}
                </span>
              </div>

              {/* Checkout Action Button */}
              <button
                id="btn-open-checkout"
                type="button"
                onClick={() => setIsCheckoutOpen(true)}
                className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-98 flex items-center justify-center space-x-2"
              >
                <span>Proceed to Checkout</span>
                <span>•</span>
                <span>{formatCurrency(totalDue)}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Complete Transaction</h3>
                <p className="text-xs text-slate-400">
                  {salesType.toUpperCase()} Sale • {totalUnits} Items • Stock will be deducted immediately
                </p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleFinalizeCheckout} className="p-6 space-y-4">
              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`py-2 px-2.5 rounded-lg border text-center text-xs font-semibold transition-all ${
                      paymentMethod === 'card'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Card / POS
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 px-2.5 rounded-lg border text-center text-xs font-semibold transition-all ${
                      paymentMethod === 'cash'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Cash
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`py-2 px-2.5 rounded-lg border text-center text-xs font-semibold transition-all ${
                      paymentMethod === 'bank_transfer'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Transfer
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit_terms')}
                    className={`py-2 px-2.5 rounded-lg border text-center text-xs font-semibold transition-all ${
                      paymentMethod === 'credit_terms'
                        ? 'bg-purple-50 border-purple-600 text-purple-700 ring-2 ring-purple-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Net Terms
                  </button>
                </div>
              </div>

              {/* Cash Tendered Calculator (if cash selected) */}
              {paymentMethod === 'cash' && (
                <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-amber-900">Cash Tendered (Birr):</span>
                    <div className="flex space-x-1">
                      {(() => {
                        const rounded = Math.ceil(totalDue);
                        const birrNotes = [50, 100, 200, 500, 1000];
                        const higher = birrNotes.filter((amt) => amt >= rounded);
                        const options = Array.from(
                          new Set([rounded, ...(higher.length > 0 ? higher.slice(0, 3) : [rounded + 50, rounded + 100])])
                        );
                        return options.slice(0, 4);
                      })().map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCashTendered(String(amt))}
                          className="px-2 py-0.5 rounded bg-white border border-amber-300 text-amber-900 text-[10px] font-bold hover:bg-amber-100"
                        >
                          {amt} Birr
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min={totalDue}
                    placeholder={formatCurrency(totalDue)}
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm text-slate-900 font-bold focus:ring-2 focus:ring-amber-500"
                  />
                  {cashTendered && parseFloat(cashTendered) >= totalDue && (
                    <div className="flex justify-between text-xs font-bold text-emerald-800 pt-1">
                      <span>Change Due to Customer:</span>
                      <span>{formatCurrency(parseFloat(cashTendered) - totalDue)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Customer Details */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Marcus Vance"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Phone / Contact
                    </label>
                    <input
                      type="text"
                      placeholder="+1 (555) 000-0000"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {salesType === 'wholesale' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Wholesale Company / Tax ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Nordic Garment Distributors LLC"
                      value={customerCompany}
                      onChange={(e) => setCustomerCompany(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Transaction Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Custom packaging requested, delivery dock 3"
                    value={checkoutNotes}
                    onChange={(e) => setCheckoutNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Total Callout */}
              <div className="bg-slate-100 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 block">Final Total:</span>
                  <span className="text-xl font-extrabold text-slate-900">
                    {formatCurrency(totalDue)}
                  </span>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <span>{totalUnits} items</span>
                  <span className="block text-emerald-600 font-semibold">
                    Profit: {formatCurrency(projectedNetProfit)}
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-semibold text-xs hover:bg-slate-50 transition-colors"
                >
                  Back to Cart
                </button>
                <button
                  id="btn-confirm-checkout"
                  type="submit"
                  className="flex-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center"
                >
                  Complete Sale & Deduct Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
