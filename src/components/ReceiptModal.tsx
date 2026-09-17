import React from 'react';
import { SaleTransaction } from '../types';
import { formatCurrency } from '../utils/storage';

interface ReceiptModalProps {
  sale: SaleTransaction | null;
  onClose: () => void;
  onNewSale: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  onClose,
  onNewSale,
}) => {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTxt = () => {
    const lines = [
      '==========================================',
      '        APPARELPOS CLOTHING STORE         ',
      '      Quality Garments & Wholesale Supply ',
      '==========================================',
      `Receipt No: ${sale.receiptNumber}`,
      `Date/Time:  ${new Date(sale.timestamp).toLocaleString()}`,
      `Sales Type: ${sale.salesType.toUpperCase()}`,
      `Customer:   ${sale.customerName || 'Walk-in Guest'}`,
      sale.customerCompany ? `Company:    ${sale.customerCompany}` : '',
      '------------------------------------------',
      'ITEMS:',
      ...sale.items.map(
        (it) =>
          `${it.quantity}x ${it.productName} [${it.size}/${it.color}]\n   SKU: ${it.sku} @ ${formatCurrency(it.unitPrice)} = ${formatCurrency(it.subtotal)}`
      ),
      '------------------------------------------',
      `Subtotal:       ${formatCurrency(sale.subtotal)}`,
      sale.discount > 0 ? `Discount:       -${formatCurrency(sale.discount)}` : '',
      `Tax:            ${formatCurrency(sale.tax)}`,
      `TOTAL PAID:     ${formatCurrency(sale.totalRevenue)}`,
      '------------------------------------------',
      `Payment Method: ${sale.paymentMethod.toUpperCase().replace('_', ' ')}`,
      sale.amountTendered ? `Amount Tendered:${formatCurrency(sale.amountTendered)}` : '',
      sale.changeDue !== undefined ? `Change Given:   ${formatCurrency(sale.changeDue)}` : '',
      '==========================================',
      '     Thank you for your business!         ',
      '  Returns accepted within 14 days w/ tags ',
      '==========================================',
    ].filter(Boolean);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${sale.receiptNumber}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Notification */}
        <div className="bg-emerald-600 text-white px-5 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-base">Sale Completed Successfully</h3>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white px-2 py-0.5 rounded transition-colors text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Thermal Receipt Visual Container */}
        <div className="p-6 bg-slate-50 text-slate-800 font-mono text-xs border-b border-slate-200 select-all">
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <h2 className="font-bold text-sm text-slate-900 tracking-wider">APPARELPOS STORE</h2>
            <p className="text-[11px] text-slate-500">Retail & Wholesale Garments</p>
            <p className="text-[10px] text-slate-400">104 Garment District, Suite 400</p>
          </div>

          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Receipt #:</span>
              <span className="font-semibold text-slate-900">{sale.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date:</span>
              <span>{new Date(sale.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Sales Type:</span>
              <span
                className={`font-semibold uppercase px-1.5 py-0.2 rounded text-[10px] ${
                  sale.salesType === 'wholesale'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-indigo-100 text-indigo-800'
                }`}
              >
                {sale.salesType}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <span className="font-medium text-slate-800">{sale.customerName || 'Walk-in'}</span>
            </div>
            {sale.customerCompany && (
              <div className="flex justify-between">
                <span className="text-slate-500">Company:</span>
                <span className="font-medium text-slate-800">{sale.customerCompany}</span>
              </div>
            )}
          </div>

          {/* Itemized list */}
          <div className="py-3 border-b border-dashed border-slate-300 space-y-2">
            <div className="text-slate-400 text-[10px] uppercase flex justify-between font-semibold">
              <span>Item & Attributes</span>
              <span>Total</span>
            </div>
            {sale.items.map((item) => (
              <div key={item.id} className="space-y-0.5">
                <div className="flex justify-between text-slate-900 font-medium">
                  <span className="truncate max-w-[200px]">{item.productName}</span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[10px]">
                  <span>
                    {item.quantity} × {formatCurrency(item.unitPrice)} | Size: {item.size} | {item.color}
                  </span>
                  <span>SKU: {item.sku}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Tax ({sale.salesType === 'wholesale' ? 'Exempt' : '8%'})</span>
              <span>{formatCurrency(sale.tax)}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-200">
              <span>TOTAL</span>
              <span>{formatCurrency(sale.totalRevenue)}</span>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="pt-2 text-[11px] text-slate-600 space-y-0.5">
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span className="font-semibold uppercase">{sale.paymentMethod.replace('_', ' ')}</span>
            </div>
            {sale.amountTendered !== undefined && sale.amountTendered > 0 && (
              <>
                <div className="flex justify-between">
                  <span>Tendered:</span>
                  <span>{formatCurrency(sale.amountTendered)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Change Given:</span>
                  <span>{formatCurrency(sale.changeDue || 0)}</span>
                </div>
              </>
            )}
          </div>

          <div className="text-center pt-4 text-slate-400 text-[10px]">
            <p>Automatic stock inventory level deducted.</p>
            <p className="mt-0.5">Thank you for your visit!</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-100 flex items-center justify-between gap-3">
          <button
            id="btn-print-receipt"
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium text-xs transition-colors text-center"
          >
            Print Receipt
          </button>
          <button
            id="btn-download-txt-receipt"
            onClick={handleDownloadTxt}
            className="px-3.5 py-2.5 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-xs transition-colors"
            title="Download TXT receipt"
          >
            Download .TXT
          </button>
          <button
            id="btn-new-transaction"
            onClick={onNewSale}
            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-xs transition-colors shadow-sm text-center"
          >
            Next Transaction
          </button>
        </div>
      </div>
    </div>
  );
};
