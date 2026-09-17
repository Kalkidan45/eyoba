import React, { useState, useMemo } from 'react';
import { SaleTransaction, ClothingItem, Category, StockValuation } from '../types';
import { formatCurrency, calculateStockValuation } from '../utils/storage';

interface ReportsModuleProps {
  sales: SaleTransaction[];
  products: ClothingItem[];
  categories: Category[];
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  sales,
  products,
  categories,
}) => {
  // Available month periods derived from sales timestamps
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    sales.forEach((s) => {
      const d = new Date(s.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      set.add(key);
    });
    // Ensure current month (2026-09) is present
    set.add('2026-09');
    return Array.from(set).sort().reverse();
  }, [sales]);

  const [selectedMonth, setSelectedMonth] = useState<string>('2026-09');
  const [salesTypeFilter, setSalesTypeFilter] = useState<'all' | 'retail' | 'wholesale'>('all');

  // Filter sales by month and sales type
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const d = new Date(s.timestamp);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const matchMonth = selectedMonth === 'all' || mKey === selectedMonth;
      const matchType = salesTypeFilter === 'all' || s.salesType === salesTypeFilter;
      return matchMonth && matchType;
    });
  }, [sales, selectedMonth, salesTypeFilter]);

  // Aggregate Key Financial Metrics for the period
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + s.totalRevenue, 0);
  }, [filteredSales]);

  const totalCOGS = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + s.totalCOGS, 0);
  }, [filteredSales]);

  const netProfit = useMemo(() => {
    return totalRevenue - totalCOGS;
  }, [totalRevenue, totalCOGS]);

  const grossMarginPercent = useMemo(() => {
    return totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  }, [totalRevenue, netProfit]);

  const totalUnitsSold = useMemo(() => {
    return filteredSales.reduce(
      (sum, s) => sum + s.items.reduce((iSum, it) => iSum + it.quantity, 0),
      0
    );
  }, [filteredSales]);

  const averageOrderValue = useMemo(() => {
    return filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;
  }, [totalRevenue, filteredSales]);

  // Breakdown by Sales Type: Wholesale vs Retail
  const wholesaleSales = useMemo(() => {
    return filteredSales.filter((s) => s.salesType === 'wholesale');
  }, [filteredSales]);

  const retailSales = useMemo(() => {
    return filteredSales.filter((s) => s.salesType === 'retail');
  }, [filteredSales]);

  const wholesaleRevenue = useMemo(() => {
    return wholesaleSales.reduce((sum, s) => sum + s.totalRevenue, 0);
  }, [wholesaleSales]);

  const retailRevenue = useMemo(() => {
    return retailSales.reduce((sum, s) => sum + s.totalRevenue, 0);
  }, [retailSales]);

  const wholesaleCOGS = useMemo(() => {
    return wholesaleSales.reduce((sum, s) => sum + s.totalCOGS, 0);
  }, [wholesaleSales]);

  const retailCOGS = useMemo(() => {
    return retailSales.reduce((sum, s) => sum + s.totalCOGS, 0);
  }, [retailSales]);

  const wholesaleProfit = wholesaleRevenue - wholesaleCOGS;
  const retailProfit = retailRevenue - retailCOGS;

  const wholesaleUnits = useMemo(() => {
    return wholesaleSales.reduce(
      (sum, s) => sum + s.items.reduce((iSum, it) => iSum + it.quantity, 0),
      0
    );
  }, [wholesaleSales]);

  const retailUnits = useMemo(() => {
    return retailSales.reduce(
      (sum, s) => sum + s.items.reduce((iSum, it) => iSum + it.quantity, 0),
      0
    );
  }, [retailSales]);

  // Breakdown by Product Category
  const categoryBreakdown = useMemo(() => {
    const map: {
      [catId: string]: {
        categoryId: string;
        categoryName: string;
        unitsSold: number;
        revenue: number;
        cogs: number;
        netProfit: number;
      };
    } = {};

    categories.forEach((cat) => {
      map[cat.id] = {
        categoryId: cat.id,
        categoryName: cat.name,
        unitsSold: 0,
        revenue: 0,
        cogs: 0,
        netProfit: 0,
      };
    });

    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const catId = item.categoryId || 'unknown';
        if (!map[catId]) {
          map[catId] = {
            categoryId: catId,
            categoryName: 'Other / Apparel',
            unitsSold: 0,
            revenue: 0,
            cogs: 0,
            netProfit: 0,
          };
        }
        map[catId].unitsSold += item.quantity;
        map[catId].revenue += item.subtotal;
        map[catId].cogs += item.totalCost;
        map[catId].netProfit += (item.subtotal - item.totalCost);
      });
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [categories, filteredSales]);

  // Stock Valuation & Alerts
  const valuation: StockValuation = useMemo(() => {
    return calculateStockValuation(products);
  }, [products]);

  const lowStockItems = useMemo(() => {
    return products.filter((p) => p.stockQuantity <= p.minStockThreshold);
  }, [products]);

  // Format month name for display
  const formatMonthLabel = (key: string) => {
    if (key === 'all') return 'All Time Historical';
    const [y, m] = key.split('-');
    const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // Export Financial Summary CSV
  const handleExportFinancialReport = () => {
    const lines = [
      `APPARELPOS END-OF-MONTH FINANCIAL REPORT - ${formatMonthLabel(selectedMonth).toUpperCase()}`,
      `Generated on: ${new Date().toLocaleString()}`,
      `Sales Type Filter: ${salesTypeFilter.toUpperCase()}`,
      '',
      'EXECUTIVE FINANCIAL SUMMARY',
      `Total Revenue,${totalRevenue.toFixed(2)}`,
      `Cost of Goods Sold (COGS),${totalCOGS.toFixed(2)}`,
      `Gross / Net Profit,${netProfit.toFixed(2)}`,
      `Profit Margin %,${grossMarginPercent.toFixed(2)}%`,
      `Total Units Sold,${totalUnitsSold}`,
      `Total Orders Completed,${filteredSales.length}`,
      `Average Order Value (AOV),${averageOrderValue.toFixed(2)}`,
      '',
      'CHANNEL BREAKDOWN (WHOLESALE vs RETAIL)',
      'Channel,Units Sold,Revenue,COGS,Net Profit,Margin %',
      `Wholesale (B2B),${wholesaleUnits},${wholesaleRevenue.toFixed(2)},${wholesaleCOGS.toFixed(2)},${wholesaleProfit.toFixed(2)},${wholesaleRevenue > 0 ? ((wholesaleProfit / wholesaleRevenue) * 100).toFixed(1) : 0}%`,
      `Retail (MSRP),${retailUnits},${retailRevenue.toFixed(2)},${retailCOGS.toFixed(2)},${retailProfit.toFixed(2)},${retailRevenue > 0 ? ((retailProfit / retailRevenue) * 100).toFixed(1) : 0}%`,
      '',
      'CATEGORY PERFORMANCE BREAKDOWN',
      'Category,Units Sold,Revenue,COGS,Net Profit,Margin %',
      ...categoryBreakdown.map(
        (c) =>
          `"${c.categoryName}",${c.unitsSold},${c.revenue.toFixed(2)},${c.cogs.toFixed(2)},${c.netProfit.toFixed(2)},${c.revenue > 0 ? ((c.netProfit / c.revenue) * 100).toFixed(1) : 0}%`
      ),
      '',
      'STOCK VALUATION & REORDER ADVISORY',
      `Total Units In Stock,${valuation.totalQuantity}`,
      `Inventory Valuation at Cost (COGS Asset),${valuation.totalCostValue.toFixed(2)}`,
      `Potential Retail Value,${valuation.potentialRetailValue.toFixed(2)}`,
      `Items Below Reorder Threshold,${valuation.lowStockItemCount}`,
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EOM-Financial-Report-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-base text-slate-900">End-of-Month Reporting & Analytics</h3>
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-xs border border-indigo-100">
              {formatMonthLabel(selectedMonth)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time COGS accounting, revenue breakdown, gross margins, and wholesale vs retail comparative metrics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Month Selector */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
              <option value="all">All Time Combined</option>
            </select>
          </div>

          {/* Sales Type Filter */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            {(['all', 'retail', 'wholesale'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSalesTypeFilter(type)}
                className={`px-2.5 py-1 rounded-md font-medium capitalize transition-all ${
                  salesTypeFilter === type
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Export Report CSV */}
          <button
            id="btn-export-eom-report"
            type="button"
            onClick={handleExportFinancialReport}
            className="inline-flex items-center px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            Export Report CSV
          </button>
        </div>
      </div>

      {/* High-Impact Financial KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Wholesale: {formatCurrency(wholesaleRevenue)}</span>
            <span>Retail: {formatCurrency(retailRevenue)}</span>
          </div>
        </div>

        {/* Cost of Goods Sold (COGS) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Cost of Goods (COGS)</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-800">{formatCurrency(totalCOGS)}</div>
          <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>COGS Ratio:</span>
            <span className="font-semibold text-slate-700">
              {totalRevenue > 0 ? ((totalCOGS / totalRevenue) * 100).toFixed(1) : 0}% of Rev
            </span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Net Gross Profit</span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">{formatCurrency(netProfit)}</div>
          <div className="text-xs text-emerald-700 font-semibold flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Profit Margin:</span>
            <span>{grossMarginPercent.toFixed(1)}%</span>
          </div>
        </div>

        {/* Sales Volume & Orders */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Volume & Average Order</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{totalUnitsSold} Units</div>
          <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>{filteredSales.length} Transactions</span>
            <span>AOV: {formatCurrency(averageOrderValue)}</span>
          </div>
        </div>
      </div>

      {/* Sales Breakdown: Wholesale vs Retail Channel Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Wholesale vs Retail Card */}
        <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-900">Wholesale vs. Retail Breakdown</h4>
              <p className="text-xs text-slate-400">Comparing volume, margins, and financial contribution</p>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
                <span className="text-slate-600">Wholesale</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                <span className="text-slate-600">Retail</span>
              </span>
            </div>
          </div>

          {/* Visual Ratio Bar */}
          <div className="space-y-1.5">
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${totalRevenue > 0 ? (wholesaleRevenue / totalRevenue) * 100 : 50}%` }}
                className="bg-purple-600 transition-all duration-500"
                title={`Wholesale: ${formatCurrency(wholesaleRevenue)}`}
              />
              <div
                style={{ width: `${totalRevenue > 0 ? (retailRevenue / totalRevenue) * 100 : 50}%` }}
                className="bg-indigo-600 transition-all duration-500"
                title={`Retail: ${formatCurrency(retailRevenue)}`}
              />
            </div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-500">
              <span>
                Wholesale ({totalRevenue > 0 ? ((wholesaleRevenue / totalRevenue) * 100).toFixed(0) : 0}%)
              </span>
              <span>
                Retail ({totalRevenue > 0 ? ((retailRevenue / totalRevenue) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          </div>

          {/* Side by Side Detailed Comparison Cards */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* Wholesale Details */}
            <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-3.5 space-y-2">
              <div className="text-purple-900 font-bold text-xs">
                <span>Wholesale (B2B Bulk)</span>
              </div>
              <div className="text-lg font-bold text-purple-950">{formatCurrency(wholesaleRevenue)}</div>
              <div className="space-y-1 text-[11px] text-purple-900/80">
                <div className="flex justify-between">
                  <span>COGS:</span>
                  <span>{formatCurrency(wholesaleCOGS)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Net Profit:</span>
                  <span>{formatCurrency(wholesaleProfit)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gross Margin:</span>
                  <span>{wholesaleRevenue > 0 ? ((wholesaleProfit / wholesaleRevenue) * 100).toFixed(1) : 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Units Sold:</span>
                  <span>{wholesaleUnits} pcs</span>
                </div>
              </div>
            </div>

            {/* Retail Details */}
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3.5 space-y-2">
              <div className="text-indigo-900 font-bold text-xs">
                <span>Retail Storefront</span>
              </div>
              <div className="text-lg font-bold text-indigo-950">{formatCurrency(retailRevenue)}</div>
              <div className="space-y-1 text-[11px] text-indigo-900/80">
                <div className="flex justify-between">
                  <span>COGS:</span>
                  <span>{formatCurrency(retailCOGS)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Net Profit:</span>
                  <span>{formatCurrency(retailProfit)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gross Margin:</span>
                  <span>{retailRevenue > 0 ? ((retailProfit / retailRevenue) * 100).toFixed(1) : 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Units Sold:</span>
                  <span>{retailUnits} pcs</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Valuation & Reorder Alerts */}
        <div className="lg:col-span-6 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-900">Current Stock Valuation & Health</h4>
              <p className="text-xs text-slate-400">Total assets on hand, liquidation cost, and restock alerts</p>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
              {valuation.totalQuantity} Total Units
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block text-[11px]">COGS Asset Valuation</span>
              <span className="text-base font-bold text-slate-900">{formatCurrency(valuation.totalCostValue)}</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Capital tied up in unsold stock</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block text-[11px]">Potential Retail Value</span>
              <span className="text-base font-bold text-emerald-800">{formatCurrency(valuation.potentialRetailValue)}</span>
              <p className="text-[10px] text-emerald-600 mt-0.5">+{formatCurrency(valuation.potentialGrossProfit)} margin</p>
            </div>
          </div>

          {/* Low stock alert preview */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
              <span className="text-amber-700 font-bold">
                Items Needing Reorder ({lowStockItems.length})
              </span>
              <span className="text-[11px] text-slate-400 font-normal">Reorder Threshold Alert</span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {lowStockItems.length === 0 ? (
                <div className="p-3 text-center text-xs text-emerald-600 bg-emerald-50 rounded-lg font-medium">
                  All clothing lines healthy! No low-stock alerts.
                </div>
              ) : (
                lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-amber-50/60 border border-amber-200/70 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 block truncate max-w-[200px]">
                        {item.name} [{item.size} / {item.color}]
                      </span>
                      <span className="text-[10px] text-slate-500">
                        SKU: {item.sku} • Cost: {formatCurrency(item.purchasePrice)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-700 block">
                        {item.stockQuantity} / {item.minStockThreshold} left
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Suggest +{item.minStockThreshold * 2} pcs
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Performance Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm text-slate-900">Product Category Financial Breakdown</h4>
            <p className="text-xs text-slate-500">Revenue, COGS, Net Profit, and margin contribution per apparel department</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {categoryBreakdown.length} Categories Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold tracking-wider">
              <tr>
                <th scope="col" className="px-4 py-3">Category Name</th>
                <th scope="col" className="px-4 py-3 text-center">Units Sold</th>
                <th scope="col" className="px-4 py-3 text-right">Revenue</th>
                <th scope="col" className="px-4 py-3 text-right">COGS (Cost)</th>
                <th scope="col" className="px-4 py-3 text-right">Net Profit</th>
                <th scope="col" className="px-4 py-3 text-right">Gross Margin %</th>
                <th scope="col" className="px-4 py-3 text-center">Revenue Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {categoryBreakdown.map((cat) => {
                const marginPct = cat.revenue > 0 ? (cat.netProfit / cat.revenue) * 100 : 0;
                const revShare = totalRevenue > 0 ? (cat.revenue / totalRevenue) * 100 : 0;

                return (
                  <tr key={cat.categoryId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {cat.categoryName}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-slate-800">
                      {cat.unitsSold} pcs
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      {formatCurrency(cat.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatCurrency(cat.cogs)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">
                      {formatCurrency(cat.netProfit)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {marginPct.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${revShare}%` }}
                            className="h-full bg-indigo-600 rounded-full"
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{revShare.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction History Log for the selected period */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-sm text-slate-900">Transaction Journal & Invoices</h4>
            <p className="text-xs text-slate-500">Audit trail of completed sales with historic cost snapshots</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {filteredSales.length} Orders
          </span>
        </div>

        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs text-slate-600 divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold tracking-wider sticky top-0">
              <tr>
                <th scope="col" className="px-4 py-2.5">Receipt #</th>
                <th scope="col" className="px-4 py-2.5">Timestamp</th>
                <th scope="col" className="px-4 py-2.5">Type</th>
                <th scope="col" className="px-4 py-2.5">Customer</th>
                <th scope="col" className="px-4 py-2.5 text-center">Items</th>
                <th scope="col" className="px-4 py-2.5 text-right">Revenue</th>
                <th scope="col" className="px-4 py-2.5 text-right">COGS</th>
                <th scope="col" className="px-4 py-2.5 text-right">Net Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No sales recorded for this period.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono font-semibold text-slate-800">
                      {sale.receiptNumber}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {new Date(sale.timestamp).toLocaleDateString()} {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          sale.salesType === 'wholesale'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {sale.salesType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-900 font-medium">
                      {sale.customerName}
                      {sale.customerCompany && (
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {sale.customerCompany}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="font-semibold text-slate-700">
                        {sale.items.reduce((sum, it) => sum + it.quantity, 0)} pcs
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                      {formatCurrency(sale.totalRevenue)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500">
                      {formatCurrency(sale.totalCOGS)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-700">
                      {formatCurrency(sale.netProfit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
