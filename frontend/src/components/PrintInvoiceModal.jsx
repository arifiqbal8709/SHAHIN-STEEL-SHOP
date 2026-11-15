import React, { useRef } from 'react';
import { Printer, Download, ArrowLeft, X } from 'lucide-react';
import EstimateBillTemplate from './EstimateBillTemplate';
import TaxInvoiceTemplate from './TaxInvoiceTemplate';

const PrintInvoiceModal = ({ sale, isOpen, onClose }) => {
  const printRef = useRef();

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    const originalTitle = document.title;
    const prefix = sale.invoice_type === 'ESTIMATE_BILL' ? 'Estimate_Bill' : 'Tax_Invoice';
    document.title = `${prefix}_${sale.invoice_number || 'Bill'}_SHAHIN_STEEL_FURNITURE`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1200);
  };

  const handleDownloadPDF = () => {
    handlePrint();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-4">
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="no-print bg-[#211F1C] text-white px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/15 cursor-pointer"
              title="Back to bills"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
            <div>
              <h3 className="font-serif font-bold text-sm text-white">
                {sale.invoice_type === 'ESTIMATE_BILL' ? 'Estimate Bill' : 'Tax Invoice'}: {sale.invoice_number || 'New Bill'}
              </h3>
              <p className="text-[10px] text-[#C49A6C]">
                Shahin Steel Furniture {sale.invoice_type === 'ESTIMATE_BILL' ? 'Estimate / Proforma Bill' : 'GST Tax Invoice'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#C49A6C] text-[#211F1C] font-extrabold text-xs hover:bg-[#dfb76c] transition-all shadow-gold-glow cursor-pointer"
            >
              <Printer size={15} /> {sale.invoice_type === 'ESTIMATE_BILL' ? 'Print Estimate' : 'Print Tax Invoice'}
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all shadow-subtle cursor-pointer"
            >
              <Download size={15} /> Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div className="p-4 sm:p-6 bg-white text-black font-sans text-[11px] leading-tight print:p-0 print:m-0">
          <div ref={printRef}>
            {sale.invoice_type === 'ESTIMATE_BILL' ? (
              <EstimateBillTemplate sale={sale} />
            ) : (
              <TaxInvoiceTemplate sale={sale} />
            )}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="no-print bg-[#F7F5F0] px-6 py-4 border-t border-[#E5E2DE] flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E5E2DE] bg-white text-[#211F1C] font-bold text-xs hover:bg-stone-50 cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-subtle cursor-pointer"
            >
              <Download size={16} />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#211F1C] hover:bg-[#34312d] text-[#C49A6C] font-extrabold text-xs transition-all shadow-md cursor-pointer"
            >
              <Printer size={16} />
              <span>Print Bill</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintInvoiceModal;
