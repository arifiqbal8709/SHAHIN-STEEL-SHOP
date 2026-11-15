import React from 'react';

const TaxInvoiceTemplate = ({ sale }) => {
  if (!sale) return null;

  const fmt = (n) => Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

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
    const [integer] = Math.round(Number(num || 0)).toString().split('.');
    const words = inWords(integer);
    return words ? `${words} Rupees Only` : 'Zero Rupees Only';
  };

  const invoiceDateStr = sale.sale_date
    ? new Date(sale.sale_date).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const customerName = (sale.customer_name || sale.customer?.name || 'Cash Customer').trim();
  const customerAddress = (sale.customer_address || sale.customer?.address || 'Haji Nagar, Chas, Bokaro').trim();
  const placeOfSupply = (sale.place_of_supply || sale.customer_city || sale.customer?.city || 'HAJI NAGAR ANSARI MOHALLA CHAS BOKARO').trim();
  const customerGstin = (sale.customer_gstin || sale.customer?.gstin || '').trim();
  const stateCode = (sale.state_code || sale.customer?.pincode || '827013').trim();

  // Shipping details (custom or same as customer)
  const shippingName = (sale.shipping_name || customerName).trim();
  const shippingAddress = (sale.shipping_address || customerAddress).trim();
  const shippingPlaceOfSupply = (sale.shipping_place_of_supply || placeOfSupply).trim();
  const shippingGstin = (sale.shipping_gstin || customerGstin).trim();
  const shippingStateCode = (sale.shipping_state_code || stateCode).trim();

  const items = (sale.items && sale.items.length > 0) ? sale.items : [];

  // Calculate taxes
  const taxableTotal = items.reduce((acc, itm) => {
    const qty = Number(itm.quantity || 1);
    const rate = Number(itm.unit_selling_price || itm.unit_price || 0);
    const disc = Number(itm.discount_amount || itm.discount || 0);
    return acc + ((qty * rate) - disc);
  }, 0);

  // Determine if Inter-State (IGST) or Intra-State (CGST + SGST)
  const isInterState = sale.gst_type === 'INTER_STATE' || Number(sale.igst_amount || 0) > 0;
  const cgstTotal = isInterState ? 0 : (sale.cgst_amount !== undefined ? Number(sale.cgst_amount) : taxableTotal * 0.09);
  const sgstTotal = isInterState ? 0 : (sale.sgst_amount !== undefined ? Number(sale.sgst_amount) : taxableTotal * 0.09);
  const igstTotal = isInterState ? (sale.igst_amount !== undefined && Number(sale.igst_amount) > 0 ? Number(sale.igst_amount) : taxableTotal * 0.18) : 0;
  const grandTotal = sale.grand_total ? Number(sale.grand_total) : (taxableTotal + cgstTotal + sgstTotal + igstTotal);

  // Minimum row count so the table matches the exact tall height of the sample invoice
  const TOTAL_DISPLAY_ROWS = 12;
  const emptyRowsCount = Math.max(0, TOTAL_DISPLAY_ROWS - items.length);

  return (
    <div className="tax-invoice-wrapper w-full bg-white text-black font-sans leading-tight">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .printable-tax-invoice {
            width: 100% !important;
            max-width: 100% !important;
            border: 2px solid black !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Main Single-Page Tax Invoice Box */}
      <div className="printable-tax-invoice border-2 border-black max-w-[800px] w-full mx-auto bg-white text-black text-[10.5px]">
        {/* 1. Top Header Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-black text-[11px] font-bold">
          <span>GSTIN - 20AHXPA9002C1ZW</span>
          <span className="text-sm font-extrabold tracking-widest uppercase">TAX INVOICE</span>
          <span>Mobile No. - 8969362968</span>
        </div>

        {/* 2. Company Title & Address */}
        <div className="text-center py-2 px-3 border-b border-black">
          <h1 className="text-2xl font-black tracking-tight text-black m-0 uppercase font-sans">
            M/S SHAHIN STEEL FURNITURE
          </h1>
          <p className="text-[11px] font-semibold text-black mt-0.5">
            Haji Nagar, Near Colonels Public School, Chas
          </p>
          <p className="text-[11px] font-semibold text-black">
            Bokaro, Jharkhand - 827013
          </p>
        </div>

        {/* 3. Invoice Number & Date */}
        <div className="flex items-center justify-between px-3 py-1 border-b border-black text-xs font-bold bg-white">
          <span>Invoice No. - {sale.invoice_number || 'TAX-001'}</span>
          <span>Invoice Date - {invoiceDateStr}</span>
        </div>

        {/* 4. Customers Details & Shipping Details (2 Columns) */}
        <div className="grid grid-cols-2 border-b border-black text-[10.5px]">
          {/* Customers Details */}
          <div className="p-2 border-r border-black space-y-0.5">
            <p className="font-bold text-[11px] mb-1">Customers Details :</p>
            <div className="flex items-start">
              <span className="font-bold w-28 shrink-0">Customer Name :</span>
              <span className="font-bold uppercase">{customerName}</span>
            </div>
            <div className="flex items-start">
              <span className="font-bold w-28 shrink-0">Address :</span>
              <span className="uppercase leading-tight">{customerAddress}</span>
            </div>
            <div className="flex items-start">
              <span className="font-bold w-28 shrink-0">Place of Supply :</span>
              <span className="uppercase">{placeOfSupply}</span>
            </div>
            <div className="flex items-start">
              <span className="font-bold w-28 shrink-0">GSTIN :</span>
              <span className="font-mono">{customerGstin || 'N/A'}</span>
            </div>
            <div className="flex items-start">
              <span className="font-bold w-28 shrink-0">State Code :</span>
              <span>{stateCode || '827013'}</span>
            </div>
          </div>

          {/* Shipping Details */}
          <div className="p-2 space-y-0.5">
            <p className="font-bold text-[11px] mb-1">Shipping Details :</p>
            <div className="flex items-start">
              <span className="font-bold w-28 shrink-0">Customer Name :</span>
              <span className="font-bold uppercase">{shippingName || customerName}</span>
            </div>
            <div className="flex items-start">
              <span className="font-bold w-28 shrink-0">Address :</span>
              <span className="uppercase leading-tight">{shippingAddress || customerAddress}</span>
            </div>
            <div className="flex items-start">
              <span className="font-bold w-28 shrink-0">Place of Supply :</span>
              <span className="uppercase">{shippingPlaceOfSupply || placeOfSupply}</span>
            </div>
            <div className="flex items-start">
              <span className="font-bold w-28 shrink-0">GSTIN :</span>
              <span className="font-mono">{shippingGstin || customerGstin || 'N/A'}</span>
            </div>
            <div className="flex items-start">
              <span className="font-bold w-28 shrink-0">State Code :</span>
              <span>{shippingStateCode || stateCode || '827013'}</span>
            </div>
          </div>
        </div>

        {/* 5. Reverse Charges Row */}
        <div className="px-3 py-1 border-b border-black text-[10.5px] font-semibold">
          Tax is payable in Reverse Charges (Yes/No) : <span className="font-bold">{sale.reverse_charge || 'No'}</span>
        </div>

        {/* 6. Items Table */}
        <table className="w-full text-center border-collapse border-b border-black text-[10px]">
          <thead>
            <tr className="border-b border-black font-bold">
              <th rowSpan="2" className="border-r border-black p-1 text-left w-36 uppercase">PRODUCT</th>
              <th rowSpan="2" className="border-r border-black p-1 w-14">HSN/SAC</th>
              <th rowSpan="2" className="border-r border-black p-1 w-10">QTY</th>
              <th rowSpan="2" className="border-r border-black p-1 w-12">Units</th>
              <th rowSpan="2" className="border-r border-black p-1 w-16">Rate</th>
              <th rowSpan="2" className="border-r border-black p-1 w-18">Taxable<br />Value</th>
              <th colSpan="2" className="border-r border-black p-0.5 border-b border-black">CGST</th>
              <th colSpan="2" className="border-r border-black p-0.5 border-b border-black">SGST</th>
              <th colSpan="2" className="border-r border-black p-0.5 border-b border-black">IGST</th>
              <th rowSpan="2" className="p-1 w-18">Total</th>
            </tr>
            <tr className="border-b border-black font-bold">
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
              const qty = Number(itm.quantity || 1);
              const rate = Number(itm.unit_selling_price || itm.unit_price || 0);
              const disc = Number(itm.discount_amount || itm.discount || 0);
              const taxableVal = (qty * rate) - disc;

              const cgstRate = isInterState ? '0%' : '9%';
              const cgstAmt = isInterState ? 0 : taxableVal * 0.09;
              const sgstRate = isInterState ? '0%' : '9%';
              const sgstAmt = isInterState ? 0 : taxableVal * 0.09;
              const igstRate = isInterState ? '18%' : '0%';
              const igstAmt = isInterState ? taxableVal * 0.18 : 0;
              const lineTotal = taxableVal + cgstAmt + sgstAmt + igstAmt;

              return (
                <tr key={i} className="border-b border-black/40 h-6">
                  <td className="border-r border-black p-1 text-left uppercase font-bold truncate max-w-[150px]">
                    {itm.product_name || 'STEEL PRODUCT'}
                  </td>
                  <td className="border-r border-black p-1 font-mono text-[9px]">{itm.hsn_code || '-'}</td>
                  <td className="border-r border-black p-1 font-bold">{qty}</td>
                  <td className="border-r border-black p-1">{itm.unit || 'Units'}</td>
                  <td className="border-r border-black p-1 text-right">{fmt(rate)}</td>
                  <td className="border-r border-black p-1 text-right font-bold">{fmt(taxableVal)}</td>
                  <td className="border-r border-black p-1">{cgstRate}</td>
                  <td className="border-r border-black p-1 text-right">{fmt(cgstAmt)}</td>
                  <td className="border-r border-black p-1">{sgstRate}</td>
                  <td className="border-r border-black p-1 text-right">{fmt(sgstAmt)}</td>
                  <td className="border-r border-black p-1">{igstRate}</td>
                  <td className="border-r border-black p-1 text-right">{fmt(igstAmt)}</td>
                  <td className="p-1 text-right font-bold">{fmt(lineTotal)}</td>
                </tr>
              );
            })}

            {/* Empty Fill Rows to maintain exact template height */}
            {Array.from({ length: emptyRowsCount }).map((_, idx) => (
              <tr key={`empty-${idx}`} className="border-b border-black/30 h-5">
                <td className="border-r border-black p-1">&nbsp;</td>
                <td className="border-r border-black p-1">&nbsp;</td>
                <td className="border-r border-black p-1">&nbsp;</td>
                <td className="border-r border-black p-1">&nbsp;</td>
                <td className="border-r border-black p-1">&nbsp;</td>
                <td className="border-r border-black p-1">&nbsp;</td>
                <td className="border-r border-black p-1">&nbsp;</td>
                <td className="border-r border-black p-1">&nbsp;</td>
                <td className="border-r border-black p-1">&nbsp;</td>
                <td className="border-r border-black p-1">&nbsp;</td>
                <td className="border-r border-black p-1">&nbsp;</td>
                <td className="border-r border-black p-1">&nbsp;</td>
                <td className="p-1">&nbsp;</td>
              </tr>
            ))}

            {/* Total Row */}
            <tr className="border-t border-black font-bold h-7">
              <td colSpan="5" className="border-r border-black p-1 text-center font-bold">Total</td>
              <td className="border-r border-black p-1 text-right font-bold">{fmt(taxableTotal)}</td>
              <td className="border-r border-black p-1"></td>
              <td className="border-r border-black p-1 text-right font-bold">{fmt(cgstTotal)}</td>
              <td className="border-r border-black p-1"></td>
              <td className="border-r border-black p-1 text-right font-bold">{fmt(sgstTotal)}</td>
              <td className="border-r border-black p-1"></td>
              <td className="border-r border-black p-1 text-right font-bold">{fmt(igstTotal)}</td>
              <td className="p-1 text-right font-bold">{fmt(grandTotal)}</td>
            </tr>
          </tbody>
        </table>

        {/* 7. Bank Details & Tax Summary (50% / 50%) */}
        <div className="grid grid-cols-2 border-b border-black text-[10.5px]">
          {/* Bank Details */}
          <div className="p-2 border-r border-black space-y-0.5">
            <p className="font-bold text-[11px] mb-1">Bank Details :</p>
            <p><span className="font-bold">Bank Name :</span> Indian Bank</p>
            <p><span className="font-bold">A/c Holder Name :</span> M/S SHAHIN STEEL FURNITURE</p>
            <p><span className="font-bold">A/c No :</span> 5044458515</p>
            <p><span className="font-bold">IFSC Code :</span> IDIB000C123</p>
            <p><span className="font-bold">Type of A/c :</span> Current Account</p>
          </div>

          {/* Tax Summary Table */}
          <div className="p-2.5 flex items-center justify-center">
            <table className="border border-black text-center text-[10px] border-collapse w-full">
              <thead>
                <tr className="border-b border-black font-bold">
                  <th className="border-r border-black px-1.5 py-1">Taxable Value</th>
                  <th className="border-r border-black px-1.5 py-1">CGST</th>
                  <th className="border-r border-black px-1.5 py-1">SGST</th>
                  <th className="border-r border-black px-1.5 py-1">IGST</th>
                  <th className="px-1.5 py-1">Grand Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-bold">
                  <td className="border-r border-black px-1.5 py-1.5">{fmt(taxableTotal)}</td>
                  <td className="border-r border-black px-1.5 py-1.5">{fmt(cgstTotal)}</td>
                  <td className="border-r border-black px-1.5 py-1.5">{fmt(sgstTotal)}</td>
                  <td className="border-r border-black px-1.5 py-1.5">{fmt(igstTotal)}</td>
                  <td className="px-1.5 py-1.5 font-extrabold text-[11px]">Rs. {fmt(grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 8. Total Values & Terms and Conditions (2 Columns) */}
        <div className="grid grid-cols-2 border-b border-black text-[10.5px]">
          {/* Left Column: Total in Figures & Words */}
          <div className="border-r border-black flex flex-col justify-between">
            <div className="p-2 border-b border-black font-bold">
              Total Invoice Value (In figures) : Rs. {fmt(grandTotal)}
            </div>
            <div className="p-2 font-bold leading-normal">
              Total Invoice Value (In words) : {numberToWords(grandTotal)}
            </div>
          </div>

          {/* Right Column: E. & O.E Terms */}
          <div className="p-2 space-y-0.5 text-[10px]">
            <p className="font-bold">E. &amp; O.E</p>
            <p>1. Goods once sold cannot be returned.</p>
            <p>2. 18% Interest charged after due date.</p>
            <p>3. Subject to Bokaro Jurisdiction.</p>
          </div>
        </div>

        {/* 9. Signatures Area */}
        <div className="grid grid-cols-2 p-2.5 text-[10.5px]">
          {/* Receiver's Signature Box */}
          <div className="flex flex-col items-start justify-end">
            <div className="w-36 h-10 border border-black mb-1 bg-white"></div>
            <p className="font-bold text-[10px] pl-2">Receiver's Signature</p>
          </div>

          {/* Authorised Signatory */}
          <div className="text-right flex flex-col justify-between">
            <p className="font-bold text-[11px]">For M/S SHAHIN STEEL FURNITURE</p>
            <div className="pt-8">
              <div className="w-48 border-b border-black ml-auto mb-1"></div>
              <p className="font-bold text-[11px] pr-4">Authorised Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxInvoiceTemplate;
