import React from 'react';

const EstimateBillTemplate = ({ sale }) => {
  if (!sale) return null;

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
    const [integer] = String(num || 0).split('.');
    return inWords(integer).toUpperCase() + ' RUPEES ONLY';
  };

  const rawItems = (sale.items && sale.items.length > 0) ? sale.items : [];
  const subtotal = rawItems.reduce((acc, itm) => acc + ((Number(itm.quantity || 1) * Number(itm.unit_selling_price || itm.unit_price || 0))), 0);
  const discountTotal = Number(sale.discount_amount || sale.discount_overall || 0) + rawItems.reduce((acc, itm) => acc + Number(itm.discount_amount || itm.discount || 0), 0);
  const grandTotal = Number(sale.grand_total !== undefined ? sale.grand_total : Math.max(0, subtotal - discountTotal));

  const paymentsList = sale.payments || [];
  const cashPay = paymentsList.find(p => (p.payment_mode || p.mode || '').toUpperCase() === 'CASH');
  const upiPay = paymentsList.find(p => (p.payment_mode || p.mode || '').toUpperCase() === 'UPI');
  const cashVal = Number(cashPay?.amount || 0);
  const upiVal = Number(upiPay?.amount || 0);
  const totalPaidVal = Number(sale.amount_paid !== undefined && sale.amount_paid !== null ? sale.amount_paid : (paymentsList.length > 0 ? paymentsList.reduce((acc, p) => acc + Number(p.amount || 0), 0) : grandTotal));
  const balVal = Number(sale.balance_amount !== undefined && sale.balance_amount !== null ? sale.balance_amount : Math.max(0, grandTotal - totalPaidVal));

  const previousDue = Number(sale.customer?.total_outstanding ? Math.max(0, Number(sale.customer.total_outstanding) - balVal) : (sale.previous_due || 0));
  const netTotalDue = previousDue + balVal;

  const saleDateObj = sale.sale_date ? new Date(sale.sale_date) : new Date();
  const formattedDate = `${String(saleDateObj.getDate()).padStart(2, '0')} / ${String(saleDateObj.getMonth() + 1).padStart(2, '0')} / ${saleDateObj.getFullYear()}`;

  const customerName = sale.customer_name || sale.customer?.name || 'Walk-in Customer';
  const customerPhone = sale.customer_phone || sale.customer?.phone || 'N/A';
  const customerAddress = sale.customer_address || sale.customer?.address || 'Chas, Bokaro, Jharkhand';

  // Exactly 8 numbered rows as in the reference template
  const totalDisplayRows = Math.max(8, rawItems.length);
  const displayRows = Array.from({ length: totalDisplayRows }).map((_, idx) => rawItems[idx] || null);

  return (
    <div className="printable-invoice bg-white text-black font-sans text-[10px] leading-tight max-w-[800px] w-full mx-auto p-3 sm:p-4 border border-gray-400 print:p-0 print:border-none print:m-0 print:w-[198mm] print:max-w-[198mm]">
      {/* ── 1. Top Centered Company Header ── */}
      <div className="text-center pb-2" style={{ breakInside: 'avoid' }}>
        <h1 className="text-xl sm:text-2xl font-black text-[#16325B] tracking-wide uppercase font-sans m-0">
          MS SHAHIN STEEL FURNITURE
        </h1>
        <p className="text-[11px] font-bold text-gray-800 uppercase tracking-widest mt-0.5">
          ESTIMATE / PROFORMA BILL
        </p>
        <div className="text-[9.5px] text-gray-800 mt-1 space-y-0.5 font-medium">
          <div className="flex items-center justify-center">
            <span className="font-bold text-black">Address:</span>
            <span className="ml-1.5 underline decoration-gray-400">
              Haji Nagar, Near Colonels Public School, Chas, Bokaro - 827013
            </span>
          </div>
          <div className="flex items-center justify-center gap-x-8">
            <div>
              <span className="font-bold text-black">Mobile:</span>
              <span className="ml-1.5 underline decoration-gray-400 font-mono">8969362968</span>
            </div>
            <div>
              <span className="font-bold text-black">Email:</span>
              <span className="ml-1.5 underline decoration-gray-400">shahinsteelfurniture@gmail.com</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Meta Box: Estimate No, Customer Name & Address, Date, Mobile ── */}
      <div className="border border-gray-400 mt-1 text-[10px]" style={{ breakInside: 'avoid' }}>
        <div className="grid grid-cols-12 border-b border-gray-300">
          <div className="col-span-7 p-1 border-r border-gray-400 flex items-center">
            <span className="w-28 font-bold text-gray-800 shrink-0">Estimate No.:</span>
            <span className="font-extrabold text-black font-mono">{sale.invoice_number || 'EST-001'}</span>
          </div>
          <div className="col-span-5 p-1 flex items-center">
            <span className="w-16 font-bold text-gray-800 shrink-0">Date:</span>
            <span className="font-bold text-black font-mono">{formattedDate}</span>
          </div>
        </div>

        <div className="grid grid-cols-12 border-b border-gray-300">
          <div className="col-span-7 p-1 border-r border-gray-400 flex items-center">
            <span className="w-28 font-bold text-gray-800 shrink-0">Customer Name:</span>
            <span className="font-extrabold text-black uppercase">{customerName}</span>
          </div>
          <div className="col-span-5 p-1 flex items-center">
            <span className="w-16 font-bold text-gray-800 shrink-0">Mobile:</span>
            <span className="font-bold text-black font-mono">{customerPhone}</span>
          </div>
        </div>

        <div className="grid grid-cols-12">
          <div className="col-span-12 p-1 flex items-center">
            <span className="w-28 font-bold text-gray-800 shrink-0">Customer Address:</span>
            <span className="text-gray-900 font-medium">{customerAddress}</span>
          </div>
        </div>
      </div>

      {/* ── 3. Products Table (Navy Header, 8+ rows) ── */}
      <div className="mt-1.5 border border-gray-400" style={{ breakInside: 'avoid' }}>
        <table className="w-full border-collapse text-[10px] table-fixed">
          <thead>
            <tr className="bg-[#16325B] text-white font-extrabold text-[10px]">
              <th className="border-r border-gray-400 py-1 px-1.5 text-center w-10">S. No.</th>
              <th className="border-r border-gray-400 py-1 px-2 text-left">Description of Goods</th>
              <th className="border-r border-gray-400 py-1 px-1.5 text-center w-12">Qty.</th>
              <th className="border-r border-gray-400 py-1 px-1.5 text-center w-12">Unit</th>
              <th className="border-r border-gray-400 py-1 px-2 text-right w-24">Rate (₹)</th>
              <th className="py-1 px-2 text-right w-28">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((item, idx) => {
              const rowNum = idx + 1;
              if (item) {
                const itemRate = Number(item.unit_selling_price || item.unit_price || 0);
                const itemQty = Number(item.quantity || 1);
                const itemDisc = Number(item.discount_amount || item.discount || 0);
                const lineAmount = item.total_price !== undefined ? Number(item.total_price) : (itemQty * itemRate - itemDisc);
                return (
                  <tr key={idx} className="border-b border-gray-300 h-6">
                    <td className="border-r border-gray-400 py-0.5 px-1.5 text-center font-bold text-gray-800">{rowNum}</td>
                    <td className="border-r border-gray-400 py-0.5 px-2 font-bold text-black uppercase truncate">{item.product_name}</td>
                    <td className="border-r border-gray-400 py-0.5 px-1.5 text-center font-bold">{itemQty}</td>
                    <td className="border-r border-gray-400 py-0.5 px-1.5 text-center text-gray-700">{item.unit || 'PCS'}</td>
                    <td className="border-r border-gray-400 py-0.5 px-2 text-right font-medium">{fmt(itemRate)}</td>
                    <td className="py-0.5 px-2 text-right font-extrabold">{fmt(lineAmount)}</td>
                  </tr>
                );
              }
              // Blank filler row
              return (
                <tr key={idx} className="border-b border-gray-300 h-5">
                  <td className="border-r border-gray-400 py-0.5 px-1.5 text-center font-semibold text-gray-400">{rowNum}</td>
                  <td className="border-r border-gray-400 py-0.5 px-2"></td>
                  <td className="border-r border-gray-400 py-0.5 px-1.5"></td>
                  <td className="border-r border-gray-400 py-0.5 px-1.5"></td>
                  <td className="border-r border-gray-400 py-0.5 px-2"></td>
                  <td className="py-0.5 px-2"></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── 4. Subtotal / Discount / Grand Total (A) Box (Right Aligned) ── */}
      <div className="flex justify-end" style={{ breakInside: 'avoid' }}>
        <div className="w-64 border-x border-b border-gray-400 text-[10px]">
          <div className="flex justify-between items-center px-2.5 py-0.5 border-b border-gray-300">
            <span className="font-bold text-gray-800">Subtotal</span>
            <span className="font-bold text-black flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 bg-black"></span>
              <span className="font-extrabold">₹ {fmt(subtotal)}</span>
            </span>
          </div>
          <div className="flex justify-between items-center px-2.5 py-0.5 border-b border-gray-300">
            <span className="font-bold text-gray-800">Discount</span>
            <span className="font-bold text-black flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 bg-black"></span>
              <span className="font-extrabold">₹ {fmt(discountTotal)}</span>
            </span>
          </div>
          <div className="flex justify-between items-center px-2.5 py-1 bg-[#E8F0FE] font-black text-[11px] text-[#16325B]">
            <span>Grand Total (A)</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 bg-[#16325B]"></span>
              <span className="font-black text-xs">₹ {fmt(grandTotal)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── 5. PAYMENT & DUES DETAILS Table ── */}
      <div className="mt-2" style={{ breakInside: 'avoid' }}>
        <h4 className="text-[10px] font-black uppercase text-[#16325B] mb-0.5 tracking-wider">
          PAYMENT &amp; DUES DETAILS
        </h4>
        <div className="border border-gray-400 text-[9.5px]">
          <div className="grid grid-cols-2">
            {/* Left Column */}
            <div className="border-r border-gray-400 divide-y divide-gray-300">
              <div className="flex justify-between items-center px-2 py-0.5">
                <span className="font-bold text-gray-800">Previous Due (if any)</span>
                <span className="font-bold flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-black"></span>
                  <span>₹ {fmt(previousDue)}</span>
                </span>
              </div>
              <div className="flex justify-between items-center px-2 py-0.5">
                <span className="font-bold text-gray-800">Amount Received in Cash</span>
                <span className="font-bold text-emerald-800 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-black"></span>
                  <span>₹ {fmt(cashVal)}</span>
                </span>
              </div>
              <div className="flex justify-between items-center px-2 py-0.5">
                <span className="font-bold text-gray-800">Total Received (Cash + UPI + other)</span>
                <span className="font-extrabold text-emerald-800 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-black"></span>
                  <span>₹ {fmt(totalPaidVal)}</span>
                </span>
              </div>
              <div className="flex justify-between items-center px-2 py-0.5">
                <span className="font-bold text-gray-800">Balance Against This Bill</span>
                <span className={`font-bold flex items-center gap-1 ${balVal > 0 ? 'text-red-700' : ''}`}>
                  <span className="inline-block w-2 h-2 bg-black"></span>
                  <span>₹ {fmt(balVal)}</span>
                </span>
              </div>
              <div className="flex justify-between items-center px-2 py-1 bg-[#E8F0FE] font-black text-[#16325B]">
                <span>Net Outstanding / Total Due</span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-[#16325B]"></span>
                  <span className={`text-[10.5px] ${netTotalDue > 0 ? 'text-red-700 underline font-black' : ''}`}>₹ {fmt(netTotalDue)}</span>
                </span>
              </div>
            </div>

            {/* Right Column */}
            <div className="divide-y divide-gray-300">
              <div className="flex justify-between items-center px-2 py-0.5">
                <span className="font-bold text-gray-800">Advance Paid</span>
                <span className="font-bold flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-black"></span>
                  <span>₹ 0.00</span>
                </span>
              </div>
              <div className="flex justify-between items-center px-2 py-0.5">
                <span className="font-bold text-gray-800">Amount Received via UPI</span>
                <span className="font-bold text-blue-800 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-black"></span>
                  <span>₹ {fmt(upiVal)}</span>
                </span>
              </div>
              <div className="flex justify-between items-center px-2 py-0.5">
                <span className="font-bold text-gray-800">Payment Date</span>
                <span className="font-bold font-mono">{formattedDate}</span>
              </div>
              <div className="flex justify-between items-center px-2 py-0.5">
                <span className="font-bold text-gray-800">Previous Due Paid Now</span>
                <span className="font-bold flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-black"></span>
                  <span>₹ 0.00</span>
                </span>
              </div>
              <div className="px-2 py-1 bg-[#E8F0FE] text-[9.5px] text-[#16325B] font-bold flex items-center justify-between">
                <span>Payment Status</span>
                <span className="font-black uppercase">{balVal === 0 ? 'Fully Settled' : 'Credit Dues Pending'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. Amount in Words ── */}
      <div className="border border-gray-400 mt-1.5 p-1 text-[9.5px]" style={{ breakInside: 'avoid' }}>
        <span className="font-bold text-gray-800">Amount in Words: </span>
        <span className="font-extrabold text-black uppercase underline decoration-gray-400">
          {numberToWords(Math.round(grandTotal))}
        </span>
      </div>

      {/* ── 7. PAYMENT MODE / NOTES ── */}
      <div className="border border-gray-400 mt-1.5 p-1.5 text-[9.5px] space-y-1" style={{ breakInside: 'avoid' }}>
        <div className="flex flex-wrap items-center gap-x-4">
          <span className="font-bold text-gray-900 uppercase">Payment Mode:</span>
          <span className="flex items-center gap-1 font-semibold">
            <span className={`inline-block w-2.5 h-2.5 border border-black text-center text-[8px] font-black leading-none ${cashVal > 0 ? 'bg-black text-white' : 'bg-white'}`}>
              {cashVal > 0 ? '✓' : ''}
            </span>
            Cash
          </span>
          <span className="flex items-center gap-1 font-semibold">
            <span className={`inline-block w-2.5 h-2.5 border border-black text-center text-[8px] font-black leading-none ${upiVal > 0 ? 'bg-black text-white' : 'bg-white'}`}>
              {upiVal > 0 ? '✓' : ''}
            </span>
            UPI
          </span>
          <span className="flex items-center gap-1 font-semibold text-gray-600">
            <span className="inline-block w-2.5 h-2.5 border border-black bg-white"></span>
            Bank Transfer
          </span>
          <span className="flex items-center gap-1 font-semibold text-gray-600">
            <span className="inline-block w-2.5 h-2.5 border border-black bg-white"></span>
            Cheque
          </span>
          <span className="ml-auto font-bold text-gray-800">
            UPI / Transaction ID: <span className="font-mono text-black font-extrabold underline decoration-gray-400 ml-1">{upiPay?.transaction_id || '________________________'}</span>
          </span>
        </div>
        <div className="text-gray-800 pt-0.5 border-t border-gray-200 flex items-center">
          <span className="font-bold text-gray-900 shrink-0">Notes: </span>
          <span className="ml-1.5 underline decoration-gray-400 flex-1 truncate">
            {sale.notes || 'Estimate valid for 15 days. Delivery / installation as per mutual agreement.'}
          </span>
        </div>
      </div>

      {/* ── 8. Terms & Conditions ── */}
      <div className="mt-2 text-[8.5px] text-gray-700 space-y-0.5 leading-tight" style={{ breakInside: 'avoid' }}>
        <p className="font-bold uppercase text-gray-900 underline">Terms &amp; Conditions</p>
        <p>1. This is an estimate / proforma bill only and not a tax invoice.</p>
        <p>2. Prices and availability are subject to confirmation at the time of order.</p>
        <p>3. Delivery / installation charges, if any, will be as mutually agreed.</p>
      </div>

      {/* ── 9. Signatures Block ── */}
      <div className="grid grid-cols-2 mt-3 text-[9.5px] items-start" style={{ breakInside: 'avoid' }}>
        {/* Left: Customer Signature */}
        <div>
          <p className="font-bold text-gray-900">Customer Signature</p>
          <div className="w-44 border-b border-black mt-8 mb-1"></div>
        </div>

        {/* Right: Store Authorized Signature */}
        <div className="text-right">
          <p className="font-bold text-[10px] text-gray-900">For MS SHAHIN STEEL FURNITURE</p>
          <div className="w-48 border-b border-black ml-auto mt-8 mb-1"></div>
          <p className="font-bold text-gray-900">Authorized Signature</p>
        </div>
      </div>

      {/* ── 10. Thank You Footer ── */}
      <div className="text-center text-[9px] font-bold text-gray-600 mt-2 tracking-wider" style={{ breakInside: 'avoid' }}>
        Thank you for your business.
      </div>
    </div>
  );
};

export default EstimateBillTemplate;
