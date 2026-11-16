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

  const saleDateObj = (() => {
    if (!sale.sale_date) return new Date();
    if (typeof sale.sale_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sale.sale_date.trim())) {
      const [y, m, d] = sale.sale_date.trim().split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    const d = new Date(sale.sale_date);
    return isNaN(d.getTime()) ? new Date() : d;
  })();
  const formattedDate = `${String(saleDateObj.getDate()).padStart(2, '0')} / ${String(saleDateObj.getMonth() + 1).padStart(2, '0')} / ${saleDateObj.getFullYear()}`;

  const customerName = sale.customer_name || sale.customer?.name || 'Walk-in Customer';
  const customerPhone = sale.customer_phone || sale.customer?.phone || 'N/A';
  const customerAddress = (sale.customer_address || sale.customer?.address || '').trim() || 'N/A';

  // Exactly 8 numbered rows as in the reference template
  const totalDisplayRows = Math.max(8, rawItems.length);
  const displayRows = Array.from({ length: totalDisplayRows }).map((_, idx) => rawItems[idx] || null);

  return (
    <div
      className="printable-invoice"
      style={{
        width: '100%',
        maxWidth: '780px',
        margin: '0 auto',
        padding: '8px 12px',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '10px',
        lineHeight: 1.25,
        boxSizing: 'border-box',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        pageBreakInside: 'avoid',
        breakInside: 'avoid'
      }}
    >
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .printable-invoice {
            width: 100% !important;
            max-width: 198mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ── 1. Top Centered Company Header ── */}
      <div style={{ textAlign: 'center', paddingBottom: '6px', breakInside: 'avoid' }}>
        <h1
          style={{
            fontSize: '20px',
            fontWeight: '900',
            color: '#16325B',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            margin: '0 0 2px 0',
            fontFamily: 'Arial, Helvetica, sans-serif'
          }}
        >
          MS SHAHIN STEEL FURNITURE
        </h1>
        <p
          style={{
            fontSize: '11px',
            fontWeight: 'bold',
            color: '#1f2937',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '0 0 4px 0'
          }}
        >
          ESTIMATE / PROFORMA BILL
        </p>
        <div style={{ fontSize: '9.5px', color: '#1f2937', fontWeight: '500', lineHeight: 1.4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontWeight: 'bold', color: '#000000' }}>Address:</span>
            <span style={{ marginLeft: '6px', textDecoration: 'underline' }}>
              Haji Nagar, Near Colonels Public School, Chas, Bokaro - 827013
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '28px', marginTop: '2px' }}>
            <div>
              <span style={{ fontWeight: 'bold', color: '#000000' }}>Mobile:</span>
              <span style={{ marginLeft: '6px', textDecoration: 'underline', fontFamily: 'monospace', fontWeight: 'bold' }}>8969362968</span>
            </div>
            <div>
              <span style={{ fontWeight: 'bold', color: '#000000' }}>Email:</span>
              <span style={{ marginLeft: '6px', textDecoration: 'underline' }}>shahinsteelfurniture@gmail.com</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Meta Box: Estimate No, Customer Name & Address, Date, Mobile ── */}
      <div style={{ marginTop: '4px', border: '1.5px solid #1f2937', fontSize: '10px', breakInside: 'avoid' }}>
        {/* Row 1: Estimate No & Date */}
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', borderBottom: '1px solid #1f2937' }}>
          <div style={{ padding: '3px 8px', borderRight: '1.5px solid #1f2937', display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '105px', fontWeight: 'bold', color: '#1f2937', flexShrink: 0 }}>Estimate No.:</span>
            <span style={{ fontWeight: '900', color: '#000000', fontFamily: 'monospace' }}>{sale.invoice_number || 'EST-001'}</span>
          </div>
          <div style={{ padding: '3px 8px', display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '55px', fontWeight: 'bold', color: '#1f2937', flexShrink: 0 }}>Date:</span>
            <span style={{ fontWeight: 'bold', color: '#000000', fontFamily: 'monospace' }}>{formattedDate}</span>
          </div>
        </div>

        {/* Row 2: Customer Name & Mobile */}
        <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', borderBottom: '1px solid #1f2937' }}>
          <div style={{ padding: '3px 8px', borderRight: '1.5px solid #1f2937', display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '105px', fontWeight: 'bold', color: '#1f2937', flexShrink: 0 }}>Customer Name:</span>
            <span style={{ fontWeight: '900', color: '#000000', textTransform: 'uppercase' }}>{customerName}</span>
          </div>
          <div style={{ padding: '3px 8px', display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '55px', fontWeight: 'bold', color: '#1f2937', flexShrink: 0 }}>Mobile:</span>
            <span style={{ fontWeight: 'bold', color: '#000000', fontFamily: 'monospace' }}>{customerPhone}</span>
          </div>
        </div>

        {/* Row 3: Customer Address */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '3px 8px' }}>
          <span style={{ width: '105px', fontWeight: 'bold', color: '#1f2937', flexShrink: 0 }}>Customer Address:</span>
          <span style={{ color: '#000000', fontWeight: '500' }}>{customerAddress}</span>
        </div>
      </div>

      {/* ── 3. Products Table (Navy Header, 8+ rows) ── */}
      <div style={{ marginTop: '5px', border: '1.5px solid #1f2937', breakInside: 'avoid' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ backgroundColor: '#16325B', color: '#ffffff', fontWeight: 'bold', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
              <th style={{ borderRight: '1px solid #1f2937', borderBottom: '1.5px solid #1f2937', padding: '4px 4px', textAlign: 'center', width: '36px', backgroundColor: '#16325B', color: '#ffffff' }}>S. No.</th>
              <th style={{ borderRight: '1px solid #1f2937', borderBottom: '1.5px solid #1f2937', padding: '4px 8px', textAlign: 'left', backgroundColor: '#16325B', color: '#ffffff' }}>Description of Goods</th>
              <th style={{ borderRight: '1px solid #1f2937', borderBottom: '1.5px solid #1f2937', padding: '4px 4px', textAlign: 'center', width: '44px', backgroundColor: '#16325B', color: '#ffffff' }}>Qty.</th>
              <th style={{ borderRight: '1px solid #1f2937', borderBottom: '1.5px solid #1f2937', padding: '4px 4px', textAlign: 'center', width: '44px', backgroundColor: '#16325B', color: '#ffffff' }}>Unit</th>
              <th style={{ borderRight: '1px solid #1f2937', borderBottom: '1.5px solid #1f2937', padding: '4px 8px', textAlign: 'right', width: '92px', backgroundColor: '#16325B', color: '#ffffff' }}>Rate (₹)</th>
              <th style={{ borderBottom: '1.5px solid #1f2937', padding: '4px 8px', textAlign: 'right', width: '108px', backgroundColor: '#16325B', color: '#ffffff' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((item, idx) => {
              const rowNum = idx + 1;
              const isLast = rowNum === displayRows.length;
              const rowBorder = isLast ? 'none' : '1px solid #d1d5db';
              if (item) {
                const itemRate = Number(item.unit_selling_price || item.unit_price || 0);
                const itemQty = Number(item.quantity || 1);
                const itemDisc = Number(item.discount_amount || item.discount || 0);
                const lineAmount = item.total_price !== undefined ? Number(item.total_price) : (itemQty * itemRate - itemDisc);
                return (
                  <tr key={idx} style={{ borderBottom: rowBorder, height: '21px' }}>
                    <td style={{ borderRight: '1px solid #1f2937', padding: '2px 4px', textAlign: 'center', fontWeight: 'bold', color: '#1f2937' }}>{rowNum}</td>
                    <td style={{ borderRight: '1px solid #1f2937', padding: '2px 8px', fontWeight: 'bold', color: '#000000', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product_name}</td>
                    <td style={{ borderRight: '1px solid #1f2937', padding: '2px 4px', textAlign: 'center', fontWeight: 'bold' }}>{itemQty}</td>
                    <td style={{ borderRight: '1px solid #1f2937', padding: '2px 4px', textAlign: 'center', color: '#374151' }}>{item.unit || 'PCS'}</td>
                    <td style={{ borderRight: '1px solid #1f2937', padding: '2px 8px', textAlign: 'right', fontWeight: '500' }}>{fmt(itemRate)}</td>
                    <td style={{ padding: '2px 8px', textAlign: 'right', fontWeight: '900' }}>{fmt(lineAmount)}</td>
                  </tr>
                );
              }
              // Blank filler row to maintain visual balance
              return (
                <tr key={idx} style={{ borderBottom: rowBorder, height: '18px' }}>
                  <td style={{ borderRight: '1px solid #1f2937', padding: '1px 4px', textAlign: 'center', color: '#9ca3af', fontWeight: '600' }}>{rowNum}</td>
                  <td style={{ borderRight: '1px solid #1f2937', padding: '1px 8px' }}>&nbsp;</td>
                  <td style={{ borderRight: '1px solid #1f2937', padding: '1px 4px' }}>&nbsp;</td>
                  <td style={{ borderRight: '1px solid #1f2937', padding: '1px 4px' }}>&nbsp;</td>
                  <td style={{ borderRight: '1px solid #1f2937', padding: '1px 8px' }}>&nbsp;</td>
                  <td style={{ padding: '1px 8px' }}>&nbsp;</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── 4. Subtotal / Discount / Grand Total (A) Box (Right Aligned) ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', breakInside: 'avoid' }}>
        <div style={{ width: '256px', borderLeft: '1.5px solid #1f2937', borderRight: '1.5px solid #1f2937', borderBottom: '1.5px solid #1f2937', fontSize: '9.5px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 8px', borderBottom: '1px solid #d1d5db' }}>
            <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Subtotal</span>
            <span style={{ fontWeight: '900', color: '#000000' }}>₹ {fmt(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 8px', borderBottom: '1px solid #d1d5db' }}>
            <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Discount</span>
            <span style={{ fontWeight: '900', color: '#000000' }}>₹ {fmt(discountTotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 8px', backgroundColor: '#E8F0FE', color: '#16325B', fontWeight: '900', fontSize: '10.5px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            <span>Grand Total (A)</span>
            <span style={{ fontSize: '11.5px' }}>₹ {fmt(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* ── 5. PAYMENT & DUES DETAILS Table ── */}
      <div style={{ marginTop: '5px', breakInside: 'avoid' }}>
        <h4 style={{ fontSize: '9.5px', fontWeight: '900', textTransform: 'uppercase', color: '#16325B', margin: '0 0 2px 0', letterSpacing: '0.04em' }}>
          PAYMENT &amp; DUES DETAILS
        </h4>
        <div style={{ border: '1.5px solid #1f2937', fontSize: '9px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {/* Left Column */}
            <div style={{ borderRight: '1.5px solid #1f2937' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 8px', borderBottom: '1px solid #d1d5db' }}>
                <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Previous Due (if any)</span>
                <span style={{ fontWeight: 'bold' }}>₹ {fmt(previousDue)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 8px', borderBottom: '1px solid #d1d5db' }}>
                <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Amount Received in Cash</span>
                <span style={{ fontWeight: 'bold', color: '#065f46' }}>₹ {fmt(cashVal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 8px', borderBottom: '1px solid #d1d5db' }}>
                <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Total Received (Cash + UPI + other)</span>
                <span style={{ fontWeight: '900', color: '#065f46' }}>₹ {fmt(totalPaidVal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 8px', borderBottom: '1px solid #d1d5db' }}>
                <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Balance Against This Bill</span>
                <span style={{ fontWeight: 'bold', color: balVal > 0 ? '#b91c1c' : '#000000' }}>₹ {fmt(balVal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 8px', backgroundColor: '#E8F0FE', color: '#16325B', fontWeight: '900', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <span>Net Outstanding / Total Due</span>
                <span style={{ fontSize: '10px', color: netTotalDue > 0 ? '#b91c1c' : '#16325B', textDecoration: netTotalDue > 0 ? 'underline' : 'none' }}>₹ {fmt(netTotalDue)}</span>
              </div>
            </div>

            {/* Right Column */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 8px', borderBottom: '1px solid #d1d5db' }}>
                <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Advance Paid</span>
                <span style={{ fontWeight: 'bold' }}>₹ 0.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 8px', borderBottom: '1px solid #d1d5db' }}>
                <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Amount Received via UPI</span>
                <span style={{ fontWeight: 'bold', color: '#1e40af' }}>₹ {fmt(upiVal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 8px', borderBottom: '1px solid #d1d5db' }}>
                <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Payment Date</span>
                <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{formattedDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 8px', borderBottom: '1px solid #d1d5db' }}>
                <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Previous Due Paid Now</span>
                <span style={{ fontWeight: 'bold' }}>₹ 0.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 8px', backgroundColor: '#E8F0FE', color: '#16325B', fontSize: '9px', fontWeight: 'bold', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <span>Payment Status</span>
                <span style={{ fontWeight: '900', textTransform: 'uppercase' }}>{balVal === 0 ? 'Fully Settled' : 'Credit Dues Pending'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. Amount in Words ── */}
      <div style={{ border: '1.5px solid #1f2937', marginTop: '4px', padding: '3px 8px', fontSize: '9px', breakInside: 'avoid' }}>
        <span style={{ fontWeight: 'bold', color: '#1f2937' }}>Amount in Words: </span>
        <span style={{ fontWeight: '900', color: '#000000', textTransform: 'uppercase' }}>
          {numberToWords(Math.round(grandTotal))}
        </span>
      </div>

      {/* ── 7. PAYMENT MODE / NOTES ── */}
      <div style={{ border: '1.5px solid #1f2937', marginTop: '4px', padding: '4px 8px', fontSize: '9px', breakInside: 'avoid' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: '14px' }}>
          <span style={{ fontWeight: '900', color: '#000000', textTransform: 'uppercase' }}>Payment Mode:</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
            <span style={{ display: 'inline-block', width: '11px', height: '11px', border: '1.5px solid #000000', textAlign: 'center', fontSize: '8px', fontWeight: '900', lineHeight: '11px', backgroundColor: cashVal > 0 ? '#000000' : '#ffffff', color: '#ffffff' }}>
              {cashVal > 0 ? '✓' : ''}
            </span>
            Cash
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
            <span style={{ display: 'inline-block', width: '11px', height: '11px', border: '1.5px solid #000000', textAlign: 'center', fontSize: '8px', fontWeight: '900', lineHeight: '11px', backgroundColor: upiVal > 0 ? '#000000' : '#ffffff', color: '#ffffff' }}>
              {upiVal > 0 ? '✓' : ''}
            </span>
            UPI
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', color: '#4b5563' }}>
            <span style={{ display: 'inline-block', width: '11px', height: '11px', border: '1.5px solid #000000', backgroundColor: '#ffffff' }}></span>
            Bank Transfer
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600', color: '#4b5563' }}>
            <span style={{ display: 'inline-block', width: '11px', height: '11px', border: '1.5px solid #000000', backgroundColor: '#ffffff' }}></span>
            Cheque
          </span>
          <span style={{ marginLeft: 'auto', fontWeight: 'bold', color: '#1f2937' }}>
            UPI / Tx ID: <span style={{ fontFamily: 'monospace', color: '#000000', fontWeight: '900', textDecoration: 'underline' }}>{upiPay?.transaction_id || '____________________'}</span>
          </span>
        </div>
        <div style={{ color: '#1f2937', paddingTop: '2px', marginTop: '2px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', color: '#000000', flexShrink: 0 }}>Notes: </span>
          <span style={{ marginLeft: '6px', color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {sale.notes || 'Estimate valid for 15 days. Delivery / installation as per mutual agreement.'}
          </span>
        </div>
      </div>

      {/* ── 8. Terms & Conditions ── */}
      <div style={{ marginTop: '5px', fontSize: '8.5px', color: '#374151', lineHeight: 1.3, breakInside: 'avoid' }}>
        <p style={{ fontWeight: 'bold', textTransform: 'uppercase', color: '#000000', textDecoration: 'underline', margin: '0 0 1px 0' }}>Terms &amp; Conditions</p>
        <p style={{ margin: 0 }}>1. This is an estimate / proforma bill only and not a tax invoice.</p>
        <p style={{ margin: 0 }}>2. Prices and availability are subject to confirmation at the time of order.</p>
        <p style={{ margin: 0 }}>3. Delivery / installation charges, if any, will be as mutually agreed.</p>
      </div>

      {/* ── 9. Signatures Block ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: '10px', fontSize: '9.5px', breakInside: 'avoid' }}>
        {/* Left: Customer Signature */}
        <div>
          <p style={{ fontWeight: 'bold', color: '#000000', margin: 0 }}>Customer Signature</p>
          <div style={{ width: '160px', borderBottom: '1.5px solid #000000', marginTop: '24px', marginBottom: '3px' }}></div>
        </div>

        {/* Right: Store Authorized Signature */}
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontWeight: 'bold', fontSize: '10px', color: '#000000', margin: 0 }}>For MS SHAHIN STEEL FURNITURE</p>
          <div style={{ width: '180px', borderBottom: '1.5px solid #000000', marginLeft: 'auto', marginTop: '24px', marginBottom: '3px' }}></div>
          <p style={{ fontWeight: 'bold', color: '#000000', margin: 0 }}>Authorized Signature</p>
        </div>
      </div>

      {/* ── 10. Thank You Footer ── */}
      <div style={{ textAlign: 'center', fontSize: '9px', fontWeight: 'bold', color: '#4b5563', marginTop: '6px', letterSpacing: '0.04em', breakInside: 'avoid' }}>
        Thank you for your business.
      </div>
    </div>
  );
};

export default EstimateBillTemplate;
