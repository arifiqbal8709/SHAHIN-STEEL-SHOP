import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import EstimateBillTemplate from '../components/EstimateBillTemplate';
import TaxInvoiceTemplate from '../components/TaxInvoiceTemplate';

const TaxInvoice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const printRef = useRef();

  const sale = location.state?.sale || location.state?.bill || {
    invoice_number: 'TAX-001',
    sale_date: '2026-03-07',
    customer_name: 'ABDULLAH',
    customer_address: 'HAJI NAGAR ANSARI MOHALLA CHAS BOKARO',
    customer_city: 'HAJI NAGAR ANSARI MOHALLA CHAS BOKARO',
    customer_gstin: '22AAAAA0000A1Z5',
    state_code: '827013',
    shipping_name: 'ABDULLAH',
    shipping_address: 'ANSARI MOHALLA, HAZI NAGAR, CHAS near Akash hospital',
    shipping_place_of_supply: 'HAJI NAGAR ANSARI MOHALLA CHAS BOKARO',
    shipping_gstin: '22AAAAA0000A1Z5',
    shipping_state_code: '827013',
    reverse_charge: 'No',
    gst_type: 'INTER_STATE',
    items: [
      { product_name: 'DRASING', quantity: 21, unit_selling_price: 2000, discount_amount: 0, unit: 'Units' }
    ]
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const prefix = sale.invoice_type === 'ESTIMATE_BILL' ? 'Estimate_Bill' : 'Tax_Invoice';
    document.title = `${prefix}_${sale.invoice_number || 'Bill'}_SHAHIN_STEEL_FURNITURE`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-stone-100 p-4 sm:p-8 print:min-h-0 print:p-0 print:m-0 print:bg-white">
      {/* Top action bar (hidden on print) */}
      <div className="no-print max-w-[800px] mx-auto mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/sales')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-800 hover:bg-stone-50"
        >
          <ArrowLeft size={14} /> Back to Sales
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800 shadow cursor-pointer"
        >
          <Printer size={15} /> {sale.invoice_type === 'ESTIMATE_BILL' ? 'Print Estimate' : 'Print Tax Invoice'}
        </button>
      </div>

      {/* Invoice Card Container */}
      <div ref={printRef} className="print:m-0">
        {sale.invoice_type === 'ESTIMATE_BILL' ? (
          <EstimateBillTemplate sale={sale} />
        ) : (
          <TaxInvoiceTemplate sale={sale} />
        )}
      </div>
    </div>
  );
};

export default TaxInvoice;
