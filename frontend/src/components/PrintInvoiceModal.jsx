import React, { useRef, useEffect, useState } from 'react';
import { Printer, Download, ArrowLeft, X, Loader2 } from 'lucide-react';
import EstimateBillTemplate from './EstimateBillTemplate';
import TaxInvoiceTemplate from './TaxInvoiceTemplate';
import { exportInvoiceToPDF } from '../utils/pdfExport';

const PrintInvoiceModal = ({ sale, isOpen, onClose }) => {
  const modalScrollRef = useRef(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // When modal opens, scroll both window and modal container to top, and lock body scroll
  useEffect(() => {
    if (isOpen) {
      window.scrollTo(0, 0);
      if (modalScrollRef.current) {
        modalScrollRef.current.scrollTop = 0;
      }
      document.body.classList.add('has-print-modal');
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.classList.remove('has-print-modal');
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    const originalTitle = document.title;
    const prefix = sale.invoice_type === 'ESTIMATE_BILL' ? 'Estimate_Bill' : 'Tax_Invoice';
    const invoiceTitle = `${prefix}_${sale.invoice_number || 'Bill'}_SHAHIN_STEEL_FURNITURE`;
    document.title = invoiceTitle;

    const printableElement = document.getElementById('printable-bill-modal-content');
    if (!printableElement) {
      window.print();
      return;
    }

    try {
      // Create hidden iframe with standard A4 canvas proportions for 100% accurate layout rendering
      const iframe = document.createElement('iframe');
      iframe.setAttribute('style', 'position:fixed;top:0;left:0;width:820px;height:1160px;opacity:0;pointer-events:none;z-index:-9999;border:0;');
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();

      // Copy all parent document styles and links so fonts and Tailwind render identically
      const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(tag => tag.outerHTML)
        .join('\n');

      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${invoiceTitle}</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            ${styleTags}
            <style>
              @page {
                size: A4 portrait;
                margin: 6mm 8mm;
              }
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              }
              .print-container {
                width: 100% !important;
                max-width: 198mm !important;
                margin: 0 auto !important;
                padding: 0 !important;
              }
              .no-print {
                display: none !important;
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              ${printableElement.innerHTML}
            </div>
          </body>
        </html>
      `);
      doc.close();

      const triggerPrint = () => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (err) {
          console.error("Iframe print error, falling back to window.print():", err);
          window.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            document.title = originalTitle;
          }, 1500);
        }
      };

      if (iframe.contentWindow.document.fonts) {
        iframe.contentWindow.document.fonts.ready.then(() => {
          setTimeout(triggerPrint, 250);
        }).catch(() => {
          setTimeout(triggerPrint, 400);
        });
      } else {
        setTimeout(triggerPrint, 400);
      }
    } catch (e) {
      console.warn("Iframe creation failed, using window.print():", e);
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1200);
    }
  };

  const handleDownloadPDF = async () => {
    const printableElement = document.getElementById('printable-bill-modal-content');
    if (!printableElement) {
      handlePrint();
      return;
    }

    const prefix = sale.invoice_type === 'ESTIMATE_BILL' ? 'Estimate_Bill' : 'Tax_Invoice';
    const filename = `${prefix}_${sale.invoice_number || 'Bill'}_SHAHIN_STEEL.pdf`;

    setDownloadingPdf(true);
    try {
      await exportInvoiceToPDF(printableElement, filename);
    } catch (err) {
      console.error("Direct PDF export failed, falling back to print dialog:", err);
      // Clean fallback: open browser print dialog if canvas capture fails
      handlePrint();
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div
      ref={modalScrollRef}
      className="print-modal-wrapper fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 overflow-y-auto"
    >
      {/* ── Global Print Styles for direct Ctrl+P ── */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-modal-wrapper {
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            display: block !important;
            width: 100% !important;
          }

          .print-modal-card {
            position: static !important;
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 198mm !important;
            overflow: visible !important;
          }

          #printable-bill-modal-content {
            margin: 0 auto !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 198mm !important;
            overflow: visible !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Main Modal Card */}
      <div className="print-modal-card bg-white rounded-2xl max-w-4xl w-full shadow-2xl my-2 sm:my-3 border border-stone-300">
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="no-print bg-[#211F1C] text-white px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 sticky top-0 z-20 shadow-md rounded-t-2xl">
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
              <h3 className="font-serif font-bold text-sm text-white flex items-center gap-2">
                <span>{sale.invoice_type === 'ESTIMATE_BILL' ? 'Estimate / Retail Bill' : 'GST Tax Invoice'}:</span>
                <span className="text-[#C49A6C] font-mono font-black">{sale.invoice_number || 'New Bill'}</span>
              </h3>
              <p className="text-[10px] text-[#A39E98]">
                {sale.invoice_type === 'ESTIMATE_BILL'
                  ? 'MS Shahin Steel Furniture • Retail / Proforma Estimate (No GST)'
                  : 'M/S Shahin Steel Furniture • 18% GST Tax Invoice'}
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
              disabled={downloadingPdf}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition-all shadow-subtle cursor-pointer ${
                downloadingPdf ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {downloadingPdf ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download size={15} />
                  <span>Download PDF</span>
                </>
              )}
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
        <div id="printable-bill-modal-content" className="p-3 sm:p-6 bg-white text-black font-sans text-[11px] leading-tight">
          {sale.invoice_type === 'ESTIMATE_BILL' ? (
            <EstimateBillTemplate sale={sale} />
          ) : (
            <TaxInvoiceTemplate sale={sale} />
          )}
        </div>

        {/* Bottom Actions Bar (Hidden during print) */}
        <div className="no-print bg-[#F7F5F0] px-6 py-4 border-t border-[#E5E2DE] flex items-center justify-between rounded-b-2xl">
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
              disabled={downloadingPdf}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-subtle cursor-pointer ${
                downloadingPdf ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {downloadingPdf ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Download PDF</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#211F1C] hover:bg-[#34312d] text-[#C49A6C] font-extrabold text-xs transition-all shadow-md cursor-pointer"
            >
              <Printer size={16} />
              <span>{sale.invoice_type === 'ESTIMATE_BILL' ? 'Print Estimate' : 'Print Tax Invoice'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintInvoiceModal;
