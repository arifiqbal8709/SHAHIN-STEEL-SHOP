import React, { useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import EstimateBillTemplate from '../components/EstimateBillTemplate';

const TaxInvoice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const printRef = useRef();

  const sale = location.state?.sale || location.state?.bill || {
    invoice_number: 'TAX-001',
    sale_date: '2026-11-08',
    customer_name: 'ARIF',
    customer_address: 'N/A',
    customer_city: 'BOKARO, JHARKHAND',
    items: [
      { product_name: 'CHAIR', quantity: 5, unit_selling_price: 500, discount_amount: 0 },
      { product_name: 'CHAIR', quantity: 1, unit_selling_price: 500, discount_amount: 0 },
      { product_name: 'CHAIR', quantity: 1, unit_selling_price: 500, discount_amount: 0 },
      { product_name: 'CHAIR', quantity: 1, unit_selling_price: 500, discount_amount: 0 },
      { product_name: 'CHAIR', quantity: 1, unit_selling_price: 500, discount_amount: 0 },
      { product_name: 'CHAIR', quantity: 1, unit_selling_price: 500, discount_amount: 0 },
      { product_name: 'CHAIR', quantity: 1, unit_selling_price: 500, discount_amount: 0 }
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

  const numberToWords = (num) => {
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const inWords = (n) => {
      if ((n = n.toString()).length > 9) return 'overflow';
      const nArr = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
      if (!nArr) return '';
      let str = '';
      str += nArr[1] !== '00' ? (a[Number(nArr[1])] || b[nArr[1][0]] + ' ' + a[nArr[1][1]]) + ' Crore ' : '';
      str += nArr[2] !== '00' ? (a[Number(nArr[2])] || b[nArr[2][0]] + ' ' + a[nArr[2][1]]) + ' Lakh ' : '';
      str += nArr[3] !== '00' ? (a[Number(nArr[3])] || b[nArr[3][0]] + ' ' + a[nArr[3][1]]) + ' Thousand ' : '';
      str += nArr[4] !== '0' ? a[Number(nArr[4])] + ' Hundred ' : '';
      str += nArr[5] !== '00' ? ((str !== '') ? 'and ' : '') + (a[Number(nArr[5])] || b[nArr[5][0]] + ' ' + a[nArr[5][1]]) : '';
      return str.trim();
    };
    const [integer] = num.toString().split('.');
    return inWords(integer).toUpperCase() + ' RUPEES ONLY';
  };

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const items = sale.items || [];
  const taxableTotal = items.reduce((acc, itm) => acc + ((itm.quantity * (itm.unit_selling_price || 0)) - (itm.discount_amount || 0)), 0);
  const cgstTotal = taxableTotal * 0.09;
  const sgstTotal = taxableTotal * 0.09;
  const grandTotal = taxableTotal + cgstTotal + sgstTotal;

  const invoiceDateStr = sale.sale_date
    ? new Date(sale.sale_date).toISOString().slice(0, 10)
    : '2026-11-08';
  const customerAddress = (sale.customer_address || sale.customer?.address || '').trim() || 'N/A';
  const customerCity = (sale.customer_city || sale.customer?.city || '').trim() || 'BOKARO, JHARKHAND';

  return (
    <div className="min-h-screen bg-stone-100 p-4 sm:p-8 print:min-h-0 print:p-0 print:m-0 print:bg-white">
      {/* Top action bar */}
      <div className="no-print max-w-[800px] mx-auto mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/sales')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-bold text-stone-800 hover:bg-stone-50"
        >
          <ArrowLeft size={14} /> Back to Sales
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800 shadow"
        >
          <Printer size={15} /> {sale.invoice_type === 'ESTIMATE_BILL' ? 'Print Estimate' : 'Print / Save as PDF'}
        </button>
      </div>

      {/* Invoice Card Container */}
      <div ref={printRef} className="print:m-0">
        {sale.invoice_type === 'ESTIMATE_BILL' ? (
          <EstimateBillTemplate sale={sale} />
        ) : (
          <div className="printable-invoice border-2 border-black p-3 bg-white text-black font-sans text-[10.5px] leading-tight max-w-[800px] w-full mx-auto print:p-0 print:border-2 print:border-black print:m-0 print:w-[198mm] print:max-w-[198mm]">
            {/* Top Header Row */}
            <div className="flex justify-between items-center border-b border-black pb-1.5 text-[11px] font-bold">
          <span>GSTIN – 20AHXPA9002C1ZW</span>
          <span className="text-base font-extrabold tracking-wider italic uppercase">TAX INVOICE</span>
          <span>Mobile No. – 8969362968</span>
        </div>

        {/* Company Name & Logo */}
        <div className="py-2.5 px-2 flex items-center justify-between border-b border-black">
          <div className="w-20 flex items-center justify-center">
            <div className="w-16 h-12 bg-black text-[#C49A6C] rounded-lg flex flex-col items-center justify-center font-serif font-bold italic tracking-wider text-xs border border-black shadow-sm">
              <span className="text-[13px] leading-none">Shahin</span>
              <span className="text-[7px] tracking-widest uppercase text-white">Steel</span>
            </div>
          </div>
          <div className="flex-1 text-center pr-12">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-black m-0">
              M/S SHAHIN STEEL FURNITURE
            </h1>
            <p className="text-[11px] font-semibold text-black mt-1">
              Haji Nagar, Near Colonels Public School, Chas
            </p>
            <p className="text-[11px] font-semibold text-black">
              Bokaro, Jharkhand – 827013
            </p>
          </div>
        </div>

        {/* Invoice Number & Date */}
        <div className="flex justify-between items-center px-2 py-1.5 border-b border-black font-bold text-xs bg-stone-50">
          <span>Invoice No. – {sale.invoice_number || 'TAX-001'}</span>
          <span>Invoice Date – {invoiceDateStr}</span>
        </div>

        {/* Customer Details & Shipping Details */}
        <div className="grid grid-cols-2 border-b border-black">
          <div className="p-2 border-r border-black space-y-0.5">
            <p className="font-bold underline text-[11px]">Customer Details :</p>
            <p><span className="font-bold">Customer Name :</span> {sale.customer_name || 'ARIF'}</p>
            <p><span className="font-bold">Address :</span> {customerAddress}</p>
            <p><span className="font-bold">Place of Supply :</span> {customerCity}</p>
            <p><span className="font-bold">GSTIN :</span> N/A</p>
            <p><span className="font-bold">State Code :</span> 20</p>
          </div>

          <div className="p-2 space-y-0.5">
            <p className="font-bold underline text-[11px]">Shipping Details :</p>
            <p><span className="font-bold">Customer Name :</span> {sale.customer_name || 'ARIF'}</p>
            <p><span className="font-bold">Address :</span> {customerAddress}</p>
            <p><span className="font-bold">Place of Supply :</span> {customerCity}</p>
            <p><span className="font-bold">GSTIN :</span> N/A</p>
            <p><span className="font-bold">State Code :</span> 20</p>
          </div>
        </div>

        {/* Reverse Charges */}
        <div className="px-2 py-1 border-b border-black text-[11px] font-semibold">
          Tax is payable in Reverse Charges (Yes/No) : <strong>No</strong>
        </div>

        {/* Items Table */}
        <table className="w-full text-center border-collapse border-b border-black text-[10px]">
          <thead>
            <tr className="border-b border-black bg-stone-100 font-bold">
              <th rowSpan="2" className="border-r border-black p-1 text-left w-36">PRODUCT</th>
              <th rowSpan="2" className="border-r border-black p-1 w-14">HSN/SAC</th>
              <th rowSpan="2" className="border-r border-black p-1 w-10">QTY</th>
              <th rowSpan="2" className="border-r border-black p-1 w-12">Units</th>
              <th rowSpan="2" className="border-r border-black p-1 w-14">Rate</th>
              <th rowSpan="2" className="border-r border-black p-1 w-16">Taxable<br />Value</th>
              <th colSpan="2" className="border-r border-black p-0.5 border-b border-black">CGST</th>
              <th colSpan="2" className="border-r border-black p-0.5 border-b border-black">SGST</th>
              <th colSpan="2" className="border-r border-black p-0.5 border-b border-black">IGST</th>
              <th rowSpan="2" className="p-1 w-16">Total</th>
            </tr>
            <tr className="border-b border-black bg-stone-100 font-bold">
              <th className="border-r border-black p-0.5 w-8">Rate</th>
              <th className="border-r border-black p-0.5 w-10">Amt</th>
              <th className="border-r border-black p-0.5 w-8">Rate</th>
              <th className="border-r border-black p-0.5 w-10">Amt</th>
              <th className="border-r border-black p-0.5 w-8">Rate</th>
              <th className="border-r border-black p-0.5 w-10">Amt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((itm, i) => {
              const qty = itm.quantity || 1;
              const rate = itm.unit_selling_price || 500;
              const taxableVal = (qty * rate) - (itm.discount_amount || 0);
              const cgstAmt = taxableVal * 0.09;
              const sgstAmt = taxableVal * 0.09;
              const lineTotal = taxableVal + cgstAmt + sgstAmt;

              return (
                <tr key={i} className="border-b border-black font-semibold">
                  <td className="border-r border-black p-1 text-left uppercase font-bold">{itm.product_name || 'CHAIR'}</td>
                  <td className="border-r border-black p-1 font-mono">-</td>
                  <td className="border-r border-black p-1 font-bold">{qty}</td>
                  <td className="border-r border-black p-1">Units</td>
                  <td className="border-r border-black p-1 text-right">{fmt(rate)}</td>
                  <td className="border-r border-black p-1 text-right font-bold">{fmt(taxableVal)}</td>
                  <td className="border-r border-black p-1">9%</td>
                  <td className="border-r border-black p-1 text-right">{fmt(cgstAmt)}</td>
                  <td className="border-r border-black p-1">9%</td>
                  <td className="border-r border-black p-1 text-right">{fmt(sgstAmt)}</td>
                  <td className="border-r border-black p-1">0%</td>
                  <td className="border-r border-black p-1 text-right">0.00</td>
                  <td className="p-1 text-right font-bold">{fmt(lineTotal)}</td>
                </tr>
              );
            })}

            {/* Total Row */}
            <tr className="border-b border-black font-bold bg-stone-50">
              <td colSpan="5" className="border-r border-black p-1 text-right">Total</td>
              <td className="border-r border-black p-1 text-right font-bold">{fmt(taxableTotal)}</td>
              <td className="border-r border-black p-1"></td>
              <td className="border-r border-black p-1 text-right font-bold">{fmt(cgstTotal)}</td>
              <td className="border-r border-black p-1"></td>
              <td className="border-r border-black p-1 text-right font-bold">{fmt(sgstTotal)}</td>
              <td className="border-r border-black p-1"></td>
              <td className="border-r border-black p-1 text-right">0.00</td>
              <td className="p-1 text-right font-bold">{fmt(grandTotal)}</td>
            </tr>
          </tbody>
        </table>

        {/* Bank Details & Tax Breakdown */}
        <div className="grid grid-cols-2 border-b border-black">
          <div className="p-2 border-r border-black space-y-0.5 text-[10.5px]">
            <p className="font-bold underline">Bank Details :</p>
            <p><span className="font-semibold">Bank Name :</span> Indian Bank</p>
            <p><span className="font-semibold">A/c Holder Name :</span> M/S SHAHIN STEEL FURNITURE</p>
            <p><span className="font-semibold">A/c No :</span> 5044458515</p>
            <p><span className="font-semibold">IFSC Code :</span> IDIB000C123</p>
            <p><span className="font-semibold">Type of A/c :</span> Current Account</p>
          </div>

          <div className="p-0">
            <table className="w-full text-center border-collapse text-[10px] h-full">
              <thead>
                <tr className="border-b border-black bg-stone-100 font-bold">
                  <th className="border-r border-black p-1">Taxable<br />Value</th>
                  <th className="border-r border-black p-1">CGST</th>
                  <th className="border-r border-black p-1">SGST</th>
                  <th className="border-r border-black p-1">IGST</th>
                  <th className="p-1">Grand Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-bold">
                  <td className="border-r border-black p-1.5">{fmt(taxableTotal)}</td>
                  <td className="border-r border-black p-1.5">{fmt(cgstTotal)}</td>
                  <td className="border-r border-black p-1.5">{fmt(sgstTotal)}</td>
                  <td className="border-r border-black p-1.5">0.00</td>
                  <td className="p-1.5 text-black font-extrabold text-[11px]">
                    Rs.<br />{fmt(grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Total Value in Figures */}
        <div className="px-2 py-1.5 border-b border-black font-extrabold text-xs">
          Total Invoice Value (In figures) : Rs. {fmt(grandTotal)}
        </div>

        {/* Total Value in Words */}
        <div className="px-2 py-1.5 border-b border-black font-bold text-[10.5px]">
          Total Invoice Value (In words) : {numberToWords(Math.round(grandTotal))}
        </div>

        {/* Settlement Breakdown: Grand Total vs Received vs Baki Udhar */}
        {(() => {
          const paymentsList = sale.payments || [];
          const cashPay = paymentsList.find(p => (p.payment_mode || p.mode || '').toUpperCase() === 'CASH');
          const upiPay = paymentsList.find(p => (p.payment_mode || p.mode || '').toUpperCase() === 'UPI');
          const cashVal = Number(cashPay?.amount || 0);
          const upiVal = Number(upiPay?.amount || 0);
          const totalPaidVal = Number(sale.amount_paid !== undefined && sale.amount_paid !== null ? sale.amount_paid : (paymentsList.length > 0 ? paymentsList.reduce((acc, p) => acc + Number(p.amount || 0), 0) : (sale.balance_amount ? Math.max(0, grandTotal - Number(sale.balance_amount)) : grandTotal)));
          const balVal = Number(sale.balance_amount !== undefined && sale.balance_amount !== null ? sale.balance_amount : Math.max(0, grandTotal - totalPaidVal));

          return (
            <>
              <div className="grid grid-cols-3 border-b border-black text-center font-bold text-[10.5px]">
                <div className="p-1.5 border-r border-black bg-stone-50">
                  <span className="text-gray-600 block text-[9px] uppercase">Grand Total</span>
                  <span className="text-black font-extrabold text-xs">Rs. {fmt(grandTotal)}</span>
                </div>
                <div className="p-1.5 border-r border-black bg-stone-50">
                  <span className="text-gray-600 block text-[9px] uppercase">Amount Received</span>
                  <span className="text-emerald-700 font-extrabold text-xs">Rs. {fmt(totalPaidVal)}</span>
                </div>
                <div className={`p-1.5 ${balVal > 0 ? 'bg-amber-100/70 text-red-700 font-extrabold' : 'bg-stone-50 text-black'}`}>
                  <span className="block text-[9px] uppercase">{balVal > 0 ? '⚠️ Balance Due (Credit)' : 'Balance Due'}</span>
                  <span className={`text-xs ${balVal > 0 ? 'text-red-700 underline font-black' : 'text-black'}`}>Rs. {fmt(balVal)}</span>
                </div>
              </div>

              {/* Mode of Payment & Settlement Breakdown (Cash, UPI, Split, Udhar) */}
              <div className="px-2 py-1.5 border-b border-black bg-stone-50 font-sans text-[10.5px]">
                {balVal > 0 && totalPaidVal === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <div>
                      <span className="font-bold underline">Mode of Payment :</span>{' '}
                      <strong className="uppercase tracking-wide text-red-700">100% CREDIT SALE (DUE ON ACCOUNT)</strong>
                    </div>
                    <div className="flex items-center gap-2.5 font-bold text-[10px] text-red-700">
                      <span>• Received: <strong>Rs. 0.00</strong></span>
                      <span>• Balance Due: <strong>Rs. {fmt(balVal)}</strong></span>
                    </div>
                  </div>
                ) : balVal > 0 && totalPaidVal > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <div>
                      <span className="font-bold underline">Mode of Payment :</span>{' '}
                      <strong className="uppercase tracking-wide">PARTIAL PAYMENT (BALANCE DUE)</strong>
                    </div>
                    <div className="flex items-center gap-2 font-semibold text-[10px]">
                      {cashVal > 0 && <span>• Cash: <strong>Rs. {fmt(cashVal)}</strong></span>}
                      {upiVal > 0 && <span>• UPI: <strong>Rs. {fmt(upiVal)}</strong>{upiPay?.transaction_id ? ` (${upiPay.transaction_id})` : ''}</span>}
                      <span className="text-emerald-700">• Received: <strong>Rs. {fmt(totalPaidVal)}</strong></span>
                      <span className="text-red-700 font-extrabold bg-red-50 px-1 py-0.5 rounded border border-red-300">• Balance Due: <strong>Rs. {fmt(balVal)}</strong></span>
                    </div>
                  </div>
                ) : sale.is_emi_sale ? (
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <div>
                      <span className="font-bold underline">Mode of Payment :</span>{' '}
                      <strong className="uppercase tracking-wide">CUSTOMER EMI FINANCING</strong>
                    </div>
                    <div className="flex items-center gap-2.5 font-semibold text-[10px]">
                      <span>• Down Payment: <strong>Rs. {fmt(totalPaidVal)}</strong></span>
                      <span className="text-red-700 font-bold">• EMI Balance: <strong>Rs. {fmt(balVal)}</strong></span>
                    </div>
                  </div>
                ) : cashVal > 0 && upiVal > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <div>
                      <span className="font-bold underline">Mode of Payment :</span>{' '}
                      <strong className="uppercase tracking-wide">CASH &amp; UPI (SPLIT FULL PAID)</strong>
                    </div>
                    <div className="flex items-center gap-2.5 font-semibold text-[10px]">
                      <span>• Cash: <strong>Rs. {fmt(cashVal)}</strong></span>
                      <span>• UPI: <strong>Rs. {fmt(upiVal)}</strong>{upiPay?.transaction_id ? ` (Ref: ${upiPay.transaction_id})` : ''}</span>
                      <span className="text-emerald-700 font-bold">• Full Paid: Rs. {fmt(totalPaidVal)}</span>
                    </div>
                  </div>
                ) : upiVal > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <div>
                      <span className="font-bold underline">Mode of Payment :</span>{' '}
                      <strong className="uppercase tracking-wide">UPI / ONLINE PAYMENT (FULL PAID)</strong>
                    </div>
                    <div className="flex items-center gap-2.5 font-semibold text-[10px]">
                      <span>• UPI Received: <strong>Rs. {fmt(upiVal)}</strong>{upiPay?.transaction_id ? ` (Ref: ${upiPay.transaction_id})` : ''}</span>
                      <span className="text-emerald-700 font-bold">• Full Paid</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <div>
                      <span className="font-bold underline">Mode of Payment :</span>{' '}
                      <strong className="uppercase tracking-wide">CASH PAYMENT</strong>
                    </div>
                    <div className="flex items-center gap-2.5 font-semibold text-[10px]">
                      <span>• Cash Received: <strong>Rs. {fmt(cashVal > 0 ? cashVal : totalPaidVal)}</strong></span>
                      <span className="text-emerald-700 font-bold">• Full Paid</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          );
        })()}

        {/* Terms & Signatures */}
        <div className="grid grid-cols-2 pt-2 text-[10px]">
          <div className="space-y-0.5">
            <p className="font-bold underline">E. &amp; O.E</p>
            <p>1. Goods once sold cannot be returned.</p>
            <p>2. 18% Interest charged after due date.</p>
            <p>3. Subject to Bokaro Jurisdiction.</p>

            <div className="pt-8">
              <div className="w-40 border-b border-black"></div>
              <p className="font-bold mt-1">
                {Number(sale.balance_amount || 0) > 0 ? "Customer Signature (Credit Acceptance)" : "Receiver's Signature"}
              </p>
              {Number(sale.balance_amount || 0) > 0 && (
                <p className="text-[8.5px] text-gray-700 italic">
                  I acknowledge receipt of goods and agree to pay the remaining balance of Rs. {fmt(sale.balance_amount)}.
                </p>
              )}
            </div>
          </div>

          <div className="text-right flex flex-col justify-between">
            <div>
              <p className="font-bold text-[11px]">For M/S SHAHIN STEEL FURNITURE</p>
            </div>
            <div className="pt-10">
              <div className="w-44 border-b border-black ml-auto"></div>
              <p className="font-bold mt-1">Authorised Signatory</p>
            </div>
          </div>
        </div>
      </div>
    )}
      </div>
    </div>
  );
};

export default TaxInvoice;

