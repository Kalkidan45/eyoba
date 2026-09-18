import React, { useState, useMemo } from 'react';
import { ClothingItem, Category, StockValuation } from '../types';
import { formatCurrency, calculateStockValuation } from '../utils/storage';

interface InventoryModuleProps {
  products: ClothingItem[];
  categories: Category[];
  onAddProduct: (item: Omit<ClothingItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateProduct: (item: ClothingItem) => void;
  onDeleteProduct: (productId: string) => void;
  onQuickAdjustStock: (productId: string, delta: number, reason: string) => void;
}

const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '28x30', '30x30', '32x32', '34x32', '36x32', 'One Size'];

const COMMON_COLORS = [
  { name: 'Onyx Black', hex: '#18181b' },
  { name: 'Optic White', hex: '#f8fafc' },
  { name: 'Heather Grey', hex: '#9ca3af' },
  { name: 'Midnight Navy', hex: '#1e3a8a' },
  { name: 'Sage Olive', hex: '#52796f' },
  { name: 'Warm Khaki', hex: '#c2a688' },
  { name: 'Charcoal Grey', hex: '#374151' },
  { name: 'Desert Sand', hex: '#d4b996' },
  { name: 'Burgundy Wine', hex: '#881337' },
];

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  products,
  categories,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onQuickAdjustStock,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out' | 'in_stock'>('all');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ClothingItem | null>(null);
  const [adjustingStockProduct, setAdjustingStockProduct] = useState<ClothingItem | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState<string>('Stock Shipment Delivery');

  // Add/Edit Form State
  const [formData, setFormData] = useState({
    name: '',
    categoryId: categories[0]?.id || '',
    sku: '',
    barcode: '',
    size: 'M',
    color: 'Onyx Black',
    colorHex: '#18181b',
    purchasePrice: 10.0,
    wholesalePrice: 20.0,
    retailPrice: 45.0,
    stockQuantity: 25,
    minStockThreshold: 10,
  });

  // Calculate stock valuation
  const valuation: StockValuation = useMemo(() => {
    return calculateStockValuation(products);
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.categoryId === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.barcode.includes(q) ||
        item.color.toLowerCase().includes(q) ||
        item.size.toLowerCase().includes(q);

      let matchStatus = true;
      if (stockStatusFilter === 'out') {
        matchStatus = item.stockQuantity <= 0;
      } else if (stockStatusFilter === 'low') {
        matchStatus = item.stockQuantity > 0 && item.stockQuantity <= item.minStockThreshold;
      } else if (stockStatusFilter === 'in_stock') {
        matchStatus = item.stockQuantity > item.minStockThreshold;
      }

      return matchCat && matchQuery && matchStatus;
    });
  }, [products, selectedCategory, searchQuery, stockStatusFilter]);

  // SKU & Barcode Generator Helper
  const generateSkuAndBarcode = (catId: string, size: string, color: string) => {
    const cat = categories.find((c) => c.id === catId);
    const prefix = cat ? cat.code : 'APP';
    const colorCode = color.substring(0, 3).toUpperCase();
    const sizeCode = size.replace(/\s+/g, '');
    const rand = Math.floor(10 + Math.random() * 90);
    const generatedSku = `${prefix}-${colorCode}-${sizeCode}-${rand}`;
    const generatedBarcode = `890${Math.floor(1000000 + Math.random() * 9000000)}`;

    return { sku: generatedSku, barcode: generatedBarcode };
  };

  const handleOpenAddModal = () => {
    const defaultCat = categories[0]?.id || '';
    const { sku, barcode } = generateSkuAndBarcode(defaultCat, 'M', 'Onyx Black');
    setFormData({
      name: '',
      categoryId: defaultCat,
      sku,
      barcode,
      size: 'M',
      color: 'Onyx Black',
      colorHex: '#18181b',
      purchasePrice: 12.0,
      wholesalePrice: 24.0,
      retailPrice: 55.0,
      stockQuantity: 30,
      minStockThreshold: 10,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (item: ClothingItem) => {
    setEditingProduct(item);
    setFormData({
      name: item.name,
      categoryId: item.categoryId,
      sku: item.sku,
      barcode: item.barcode,
      size: item.size,
      color: item.color,
      colorHex: item.colorHex || '#18181b',
      purchasePrice: item.purchasePrice,
      wholesalePrice: item.wholesalePrice,
      retailPrice: item.retailPrice,
      stockQuantity: item.stockQuantity,
      minStockThreshold: item.minStockThreshold,
    });
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter an item name');
      return;
    }

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        ...formData,
        updatedAt: new Date().toISOString(),
      });
      setEditingProduct(null);
    } else {
      onAddProduct(formData);
      setIsAddModalOpen(false);
    }
  };

  // Export inventory to CSV
  const handleExportCSV = () => {
    const headers = [
      'Item Name',
      'Category',
      'SKU',
      'Barcode',
      'Size',
      'Color',
      'Purchase Price (Birr)',
      'Wholesale Price (Birr)',
      'Retail Price (Birr)',
      'Stock Quantity',
      'Min Threshold',
      'Cost Value (Birr)',
      'Retail Value (Birr)'
    ];
    const rows = products.map((p) => {
      const cat = categories.find((c) => c.id === p.categoryId)?.name || 'Unknown';
      return [
        `"${p.name}"`,
        `"${cat}"`,
        `"${p.sku}"`,
        `"${p.barcode}"`,
        `"${p.size}"`,
        `"${p.color}"`,
        p.purchasePrice.toFixed(2),
        p.wholesalePrice.toFixed(2),
        p.retailPrice.toFixed(2),
        p.stockQuantity,
        p.minStockThreshold,
        (p.stockQuantity * p.purchasePrice).toFixed(2),
        (p.stockQuantity * p.retailPrice).toFixed(2),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Valuation & Stock Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total In Stock</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{valuation.totalQuantity} Units</div>
          <p className="text-[11px] text-slate-400 mt-0.5">{valuation.totalItems} distinct variants</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Inventory Cost (COGS)</span>
          </div>
          <div className="text-xl font-bold text-slate-900">{formatCurrency(valuation.totalCostValue)}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Total capital invested at cost</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Wholesale Value</span>
          </div>
          <div className="text-xl font-bold text-purple-900">{formatCurrency(valuation.potentialWholesaleValue)}</div>
          <p className="text-[11px] text-purple-600 font-medium mt-0.5">
            +{(valuation.totalCostValue > 0 ? ((valuation.potentialWholesaleValue - valuation.totalCostValue) / valuation.totalCostValue * 100).toFixed(0) : 0)}% B2B margin
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Retail Value</span>
          </div>
          <div className="text-xl font-bold text-emerald-800">{formatCurrency(valuation.potentialRetailValue)}</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
            {formatCurrency(valuation.potentialGrossProfit)} potential gross profit
          </p>
        </div>

        <div className="col-span-2 md:col-span-1 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Stock Alerts</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-amber-600">{valuation.lowStockItemCount} Low</span>
            {valuation.outOfStockItemCount > 0 && (
              <span className="text-xs font-bold text-rose-600">({valuation.outOfStockItemCount} OOS)</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setStockStatusFilter(stockStatusFilter === 'low' ? 'all' : 'low')}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold text-left mt-1"
          >
            {stockStatusFilter === 'low' ? 'Clear filter' : 'Filter low stock items →'}
          </button>
        </div>
      </div>

      {/* Action Header & Search Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-base text-slate-900">Clothing Inventory Catalog</h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
              {filteredProducts.length} items
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-export-inventory-csv"
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center px-3 py-2 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors"
            >
              Export CSV
            </button>
            <button
              id="btn-add-new-clothing"
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              + Add Clothing Item
            </button>
          </div>
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <div>
            <input
              type="text"
              placeholder="Search by name, SKU, barcode, size, color..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1">
            {(['all', 'in_stock', 'low', 'out'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStockStatusFilter(status)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors text-center ${
                  stockStatusFilter === status
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status === 'in_stock' ? 'Healthy' : status === 'out' ? 'Out' : status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th scope="col" className="px-4 py-3">Item & Attributes</th>
                <th scope="col" className="px-4 py-3">Category</th>
                <th scope="col" className="px-4 py-3">SKU / Barcode</th>
                <th scope="col" className="px-4 py-3 text-right">Cost (COGS)</th>
                <th scope="col" className="px-4 py-3 text-right">Wholesale</th>
                <th scope="col" className="px-4 py-3 text-right">Retail</th>
                <th scope="col" className="px-4 py-3 text-center">Stock Level</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white font-normal">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-slate-500">
                    <p className="font-semibold text-sm text-slate-800">Inventory is empty</p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                      No clothing items are registered yet. Add your first item to begin tracking stock, sizes, barcodes, and pricing.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(true)}
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                    >
                      + Add First Product
                    </button>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No clothing inventory matching the filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((item) => {
                  const cat = categories.find((c) => c.id === item.categoryId);
                  const isLow = item.stockQuantity > 0 && item.stockQuantity <= item.minStockThreshold;
                  const isOut = item.stockQuantity <= 0;
                  const retailMarkup = item.purchasePrice > 0 ? ((item.retailPrice - item.purchasePrice) / item.purchasePrice * 100).toFixed(0) : '0';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name, Size & Color */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="flex items-center space-x-2 mt-0.5 text-slate-500">
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                            {item.size}
                          </span>
                          <span className="flex items-center space-x-1 text-[11px]">
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-slate-300 inline-block"
                              style={{ backgroundColor: item.colorHex || '#94a3b8' }}
                            />
                            <span>{item.color}</span>
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {cat?.name || 'Uncategorized'}
                        </span>
                      </td>

                      {/* SKU & Barcode */}
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                        <div className="text-slate-800 font-semibold">{item.sku}</div>
                        <div className="text-[10px] text-slate-400">{item.barcode}</div>
                      </td>

                      {/* Cost */}
                      <td className="px-4 py-3 text-right font-medium text-slate-700">
                        {formatCurrency(item.purchasePrice)}
                      </td>

                      {/* Wholesale */}
                      <td className="px-4 py-3 text-right font-semibold text-purple-800">
                        {formatCurrency(item.wholesalePrice)}
                      </td>

                      {/* Retail */}
                      <td className="px-4 py-3 text-right">
                        <div className="font-bold text-slate-900">{formatCurrency(item.retailPrice)}</div>
                        <div className="text-[10px] text-emerald-600 font-medium">+{retailMarkup}%</div>
                      </td>

                      {/* Stock Quantity with Visual Indicator */}
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center space-x-1.5">
                          {isOut ? (
                            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[11px]">
                              0 (Out)
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[11px]">
                              {item.stockQuantity} (Low)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                              {item.stockQuantity}
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          Min: {item.minStockThreshold}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1 text-xs font-medium">
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustingStockProduct(item);
                              setAdjustDelta(10);
                            }}
                            title="Quick Adjust Stock"
                            className="px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          >
                            Adjust
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            title="Edit Item Details"
                            className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete product ${item.name} (${item.sku})?`)) {
                                onDeleteProduct(item.id);
                              }
                            }}
                            title="Delete Item"
                            className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {(isAddModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {editingProduct ? 'Edit Clothing Inventory' : 'Add New Clothing Inventory'}
                </h3>
                <p className="text-xs text-slate-400">
                  Specify product identity, category, size, color, pricing, and stock thresholds
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProduct(null);
                }}
                className="text-slate-400 hover:text-white px-2 py-1 rounded text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Heavyweight Cotton Crewneck Tee"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Category & Auto-SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      SKU Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const { sku, barcode } = generateSkuAndBarcode(formData.categoryId, formData.size, formData.color);
                      setFormData({ ...formData, sku, barcode });
                    }}
                    className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700"
                    title="Auto-generate SKU and barcode"
                  >
                    Auto
                  </button>
                </div>
              </div>

              {/* Barcode */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Barcode (EAN-13 / UPC)
                </label>
                <div>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Size and Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Size *
                  </label>
                  <select
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    {COMMON_SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Color *
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={formData.color}
                      onChange={(e) => {
                        const selected = COMMON_COLORS.find((c) => c.name === e.target.value);
                        setFormData({
                          ...formData,
                          color: e.target.value,
                          colorHex: selected ? selected.hex : formData.colorHex,
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    >
                      {COMMON_COLORS.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                    <input
                      type="color"
                      value={formData.colorHex}
                      onChange={(e) => setFormData({ ...formData, colorHex: e.target.value })}
                      className="w-10 h-10 p-0.5 rounded-lg border border-slate-200 cursor-pointer"
                      title="Custom color swatch"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing Breakdown: Cost, Wholesale, Retail */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Pricing & Margin Strategy
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                      Purchase Cost (Birr)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-purple-700 mb-0.5">
                      Wholesale Price (Birr)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={formData.wholesalePrice}
                      onChange={(e) => setFormData({ ...formData, wholesalePrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-bold text-purple-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-emerald-700 mb-0.5">
                      Retail Price (Birr)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={formData.retailPrice}
                      onChange={(e) => setFormData({ ...formData, retailPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-bold text-emerald-900"
                    />
                  </div>
                </div>
              </div>

              {/* Stock Quantity & Threshold */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Initial Stock Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.minStockThreshold}
                    onChange={(e) => setFormData({ ...formData, minStockThreshold: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-clothing-item"
                  type="submit"
                  className="flex-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md"
                >
                  {editingProduct ? 'Update Product' : 'Save New Product to Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Stock Adjustment Modal */}
      {adjustingStockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="font-bold text-base text-slate-900">Adjust Stock Level</h3>
            <p className="text-xs text-slate-500 mt-1">
              {adjustingStockProduct.name} [{adjustingStockProduct.size} / {adjustingStockProduct.color}]
            </p>

            <div className="py-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Current Stock:</span>
                <span className="font-bold text-slate-900">{adjustingStockProduct.stockQuantity} units</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Stock Delta (+ to restock, - to write-off)
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setAdjustDelta(-5)}
                    className="px-2 py-1 rounded bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustDelta(-1)}
                    className="px-2 py-1 rounded bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(parseInt(e.target.value, 10) || 0)}
                    className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-center text-sm font-bold text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustDelta(10)}
                    className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustDelta(50)}
                    className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200"
                  >
                    +50
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason / Reference
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                >
                  <option value="Stock Shipment Delivery">New Supplier Shipment</option>
                  <option value="Customer Return">Customer Return to Stock</option>
                  <option value="Damaged / Fabric Defect">Damaged / Fabric Defect Write-off</option>
                  <option value="Physical Count Correction">Physical Inventory Count Correction</option>
                </select>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-100 text-xs flex justify-between">
                <span className="text-slate-600">New Resulting Stock:</span>
                <span className="font-bold text-slate-900">
                  {Math.max(0, adjustingStockProduct.stockQuantity + adjustDelta)} units
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustingStockProduct(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onQuickAdjustStock(adjustingStockProduct.id, adjustDelta, adjustReason);
                  setAdjustingStockProduct(null);
                }}
                className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs"
              >
                Apply Adjust
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
