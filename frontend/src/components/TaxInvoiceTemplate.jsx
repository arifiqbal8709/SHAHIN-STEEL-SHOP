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

  const invoiceDateStr = (() => {
    if (!sale.sale_date) {
      const d = new Date();
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
    if (typeof sale.sale_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sale.sale_date.trim())) {
      const [y, m, d] = sale.sale_date.trim().split('-');
      return `${d}/${m}/${y}`;
    }
    const d = new Date(sale.sale_date);
    if (!isNaN(d.getTime())) {
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
    return String(sale.sale_date);
  })();

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

  // Display rows count calibrated for single-page A4 print matching reference
  const TOTAL_DISPLAY_ROWS = 8;
  const emptyRowsCount = Math.max(0, TOTAL_DISPLAY_ROWS - items.length);

  return (
    <div
      className="printable-invoice printable-tax-invoice"
      style={{
        width: '100%',
        maxWidth: '780px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '10px',
        lineHeight: 1.25,
        boxSizing: 'border-box',
        border: '2px solid #000000',
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
          .printable-tax-invoice {
            width: 100% !important;
            max-width: 198mm !important;
            margin: 0 auto !important;
            border: 2px solid #000000 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* 1. Top Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 10px', borderBottom: '1.5px solid #000000', fontSize: '10.5px', fontWeight: 'bold' }}>
        <span>GSTIN - 20AHXPA9002C1ZW</span>
        <span style={{ fontSize: '13px', fontWeight: '900', letterSpacing: '0.1em', textTransform: 'uppercase' }}>TAX INVOICE</span>
        <span>Mobile No. - 8969362968</span>
      </div>

      {/* 2. Company Title & Address */}
      <div style={{ textAlign: 'center', padding: '6px 10px', borderBottom: '1.5px solid #000000' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '0.04em', color: '#000000', margin: '0 0 2px 0', textTransform: 'uppercase' }}>
          M/S SHAHIN STEEL FURNITURE
        </h1>
        <p style={{ fontSize: '10.5px', fontWeight: 'bold', margin: '1px 0' }}>
          Haji Nagar, Near Colonels Public School, Chas
        </p>
        <p style={{ fontSize: '10.5px', fontWeight: 'bold', margin: '1px 0' }}>
          Bokaro, Jharkhand - 827013
        </p>
      </div>

      {/* 3. Invoice Number & Date */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 10px', borderBottom: '1.5px solid #000000', fontSize: '11px', fontWeight: 'bold' }}>
        <span>Invoice No. - {sale.invoice_number || 'TAX-001'}</span>
        <span>Invoice Date - {invoiceDateStr}</span>
      </div>

      {/* 4. Customers Details & Shipping Details (2 Columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1.5px solid #000000', fontSize: '10px' }}>
        {/* Customers Details */}
        <div style={{ padding: '6px 8px', borderRight: '1.5px solid #000000' }}>
          <p style={{ fontWeight: 'bold', fontSize: '10.5px', margin: '0 0 3px 0' }}>Customers Details :</p>
          <div style={{ display: 'flex', alignItems: 'start', margin: '2px 0' }}>
            <span style={{ fontWeight: 'bold', width: '105px', flexShrink: 0 }}>Customer Name :</span>
            <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{customerName}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'start', margin: '2px 0' }}>
            <span style={{ fontWeight: 'bold', width: '105px', flexShrink: 0 }}>Address :</span>
            <span style={{ textTransform: 'uppercase', lineHeight: 1.2 }}>{customerAddress}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'start', margin: '2px 0' }}>
            <span style={{ fontWeight: 'bold', width: '105px', flexShrink: 0 }}>Place of Supply :</span>
            <span style={{ textTransform: 'uppercase' }}>{placeOfSupply}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'start', margin: '2px 0' }}>
            <span style={{ fontWeight: 'bold', width: '105px', flexShrink: 0 }}>GSTIN :</span>
            <span style={{ fontFamily: 'monospace' }}>{customerGstin || 'N/A'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'start', margin: '2px 0' }}>
            <span style={{ fontWeight: 'bold', width: '105px', flexShrink: 0 }}>State Code :</span>
            <span>{stateCode || '827013'}</span>
          </div>
        </div>

        {/* Shipping Details */}
        <div style={{ padding: '6px 8px' }}>
          <p style={{ fontWeight: 'bold', fontSize: '10.5px', margin: '0 0 3px 0' }}>Shipping Details :</p>
          <div style={{ display: 'flex', alignItems: 'start', margin: '2px 0' }}>
            <span style={{ fontWeight: 'bold', width: '105px', flexShrink: 0 }}>Customer Name :</span>
            <span style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{shippingName || customerName}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'start', margin: '2px 0' }}>
            <span style={{ fontWeight: 'bold', width: '105px', flexShrink: 0 }}>Address :</span>
            <span style={{ textTransform: 'uppercase', lineHeight: 1.2 }}>{shippingAddress || customerAddress}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'start', margin: '2px 0' }}>
            <span style={{ fontWeight: 'bold', width: '105px', flexShrink: 0 }}>Place of Supply :</span>
            <span style={{ textTransform: 'uppercase' }}>{shippingPlaceOfSupply || placeOfSupply}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'start', margin: '2px 0' }}>
            <span style={{ fontWeight: 'bold', width: '105px', flexShrink: 0 }}>GSTIN :</span>
            <span style={{ fontFamily: 'monospace' }}>{shippingGstin || customerGstin || 'N/A'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'start', margin: '2px 0' }}>
            <span style={{ fontWeight: 'bold', width: '105px', flexShrink: 0 }}>State Code :</span>
            <span>{shippingStateCode || stateCode || '827013'}</span>
          </div>
        </div>
      </div>

      {/* 5. Reverse Charges Row */}
      <div style={{ padding: '3px 10px', borderBottom: '1.5px solid #000000', fontSize: '10px', fontWeight: '600' }}>
        Tax is payable in Reverse Charges (Yes/No) : <span style={{ fontWeight: 'bold' }}>{sale.reverse_charge || 'No'}</span>
      </div>

      {/* 6. Items Table */}
      <table style={{ width: '100%', textAlign: 'center', borderCollapse: 'collapse', borderBottom: '1.5px solid #000000', fontSize: '9.5px', tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #000000', fontWeight: 'bold' }}>
            <th rowSpan="2" style={{ borderRight: '1px solid #000000', padding: '3px 4px', textAlign: 'left', width: '120px', textTransform: 'uppercase' }}>PRODUCT</th>
            <th rowSpan="2" style={{ borderRight: '1px solid #000000', padding: '3px 2px', width: '48px' }}>HSN</th>
            <th rowSpan="2" style={{ borderRight: '1px solid #000000', padding: '3px 2px', width: '34px' }}>QTY</th>
            <th rowSpan="2" style={{ borderRight: '1px solid #000000', padding: '3px 2px', width: '38px' }}>Unit</th>
            <th rowSpan="2" style={{ borderRight: '1px solid #000000', padding: '3px 4px', width: '56px', textAlign: 'right' }}>Rate</th>
            <th rowSpan="2" style={{ borderRight: '1px solid #000000', padding: '3px 4px', width: '64px', textAlign: 'right' }}>Taxable<br />Value</th>
            <th colSpan="2" style={{ borderRight: '1px solid #000000', padding: '2px', borderBottom: '1px solid #000000' }}>CGST</th>
            <th colSpan="2" style={{ borderRight: '1px solid #000000', padding: '2px', borderBottom: '1px solid #000000' }}>SGST</th>
            <th colSpan="2" style={{ borderRight: '1px solid #000000', padding: '2px', borderBottom: '1px solid #000000' }}>IGST</th>
            <th rowSpan="2" style={{ padding: '3px 4px', width: '68px', textAlign: 'right' }}>Total</th>
          </tr>
          <tr style={{ borderBottom: '1px solid #000000', fontWeight: 'bold', fontSize: '8.5px' }}>
            <th style={{ borderRight: '1px solid #000000', padding: '1px', width: '28px' }}>Rate</th>
            <th style={{ borderRight: '1px solid #000000', padding: '1px', width: '38px', textAlign: 'right' }}>Amt</th>
            <th style={{ borderRight: '1px solid #000000', padding: '1px', width: '28px' }}>Rate</th>
            <th style={{ borderRight: '1px solid #000000', padding: '1px', width: '38px', textAlign: 'right' }}>Amt</th>
            <th style={{ borderRight: '1px solid #000000', padding: '1px', width: '28px' }}>Rate</th>
            <th style={{ borderRight: '1px solid #000000', padding: '1px', width: '38px', textAlign: 'right' }}>Amt</th>
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
              <tr key={i} style={{ borderBottom: '1px solid #e5e7eb', height: '20px' }}>
                <td style={{ borderRight: '1px solid #000000', padding: '2px 4px', textAlign: 'left', textTransform: 'uppercase', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {itm.product_name || 'STEEL PRODUCT'}
                </td>
                <td style={{ borderRight: '1px solid #000000', padding: '2px', fontFamily: 'monospace', fontSize: '8.5px' }}>{itm.hsn_code || '-'}</td>
                <td style={{ borderRight: '1px solid #000000', padding: '2px', fontWeight: 'bold' }}>{qty}</td>
                <td style={{ borderRight: '1px solid #000000', padding: '2px' }}>{itm.unit || 'Units'}</td>
                <td style={{ borderRight: '1px solid #000000', padding: '2px 4px', textAlign: 'right' }}>{fmt(rate)}</td>
                <td style={{ borderRight: '1px solid #000000', padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>{fmt(taxableVal)}</td>
                <td style={{ borderRight: '1px solid #000000', padding: '2px', fontSize: '8.5px' }}>{cgstRate}</td>
                <td style={{ borderRight: '1px solid #000000', padding: '2px 4px', textAlign: 'right' }}>{fmt(cgstAmt)}</td>
                <td style={{ borderRight: '1px solid #000000', padding: '2px', fontSize: '8.5px' }}>{sgstRate}</td>
                <td style={{ borderRight: '1px solid #000000', padding: '2px 4px', textAlign: 'right' }}>{fmt(sgstAmt)}</td>
                <td style={{ borderRight: '1px solid #000000', padding: '2px', fontSize: '8.5px' }}>{igstRate}</td>
                <td style={{ borderRight: '1px solid #000000', padding: '2px 4px', textAlign: 'right' }}>{fmt(igstAmt)}</td>
                <td style={{ padding: '2px 4px', textAlign: 'right', fontWeight: '900' }}>{fmt(lineTotal)}</td>
              </tr>
            );
          })}

          {/* Empty Fill Rows to maintain exact template height */}
          {Array.from({ length: emptyRowsCount }).map((_, idx) => (
            <tr key={`empty-${idx}`} style={{ borderBottom: '1px solid #e5e7eb', height: '18px' }}>
              <td style={{ borderRight: '1px solid #000000', padding: '2px' }}>&nbsp;</td>
              <td style={{ borderRight: '1px solid #000000', padding: '2px' }}>&nbsp;</td>
              <td style={{ borderRight: '1px solid #000000', padding: '2px' }}>&nbsp;</td>
              <td style={{ borderRight: '1px solid #000000', padding: '2px' }}>&nbsp;</td>
              <td style={{ borderRight: '1px solid #000000', padding: '2px' }}>&nbsp;</td>
              <td style={{ borderRight: '1px solid #000000', padding: '2px' }}>&nbsp;</td>
              <td style={{ borderRight: '1px solid #000000', padding: '2px' }}>&nbsp;</td>
              <td style={{ borderRight: '1px solid #000000', padding: '2px' }}>&nbsp;</td>
              <td style={{ borderRight: '1px solid #000000', padding: '2px' }}>&nbsp;</td>
              <td style={{ borderRight: '1px solid #000000', padding: '2px' }}>&nbsp;</td>
              <td style={{ borderRight: '1px solid #000000', padding: '2px' }}>&nbsp;</td>
              <td style={{ borderRight: '1px solid #000000', padding: '2px' }}>&nbsp;</td>
              <td style={{ padding: '2px' }}>&nbsp;</td>
            </tr>
          ))}

          {/* Total Row */}
          <tr style={{ borderTop: '1.5px solid #000000', fontWeight: 'bold', height: '22px', backgroundColor: '#f9fafb' }}>
            <td colSpan="5" style={{ borderRight: '1px solid #000000', padding: '3px 4px', textAlign: 'center', fontWeight: 'bold' }}>Total</td>
            <td style={{ borderRight: '1px solid #000000', padding: '3px 4px', textAlign: 'right', fontWeight: '900' }}>{fmt(taxableTotal)}</td>
            <td style={{ borderRight: '1px solid #000000', padding: '3px 2px' }}></td>
            <td style={{ borderRight: '1px solid #000000', padding: '3px 4px', textAlign: 'right', fontWeight: '900' }}>{fmt(cgstTotal)}</td>
            <td style={{ borderRight: '1px solid #000000', padding: '3px 2px' }}></td>
            <td style={{ borderRight: '1px solid #000000', padding: '3px 4px', textAlign: 'right', fontWeight: '900' }}>{fmt(sgstTotal)}</td>
            <td style={{ borderRight: '1px solid #000000', padding: '3px 2px' }}></td>
            <td style={{ borderRight: '1px solid #000000', padding: '3px 4px', textAlign: 'right', fontWeight: '900' }}>{fmt(igstTotal)}</td>
            <td style={{ padding: '3px 4px', textAlign: 'right', fontWeight: '900' }}>{fmt(grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      {/* 7. Bank Details & Tax Summary (50% / 50%) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1.5px solid #000000', fontSize: '9.5px' }}>
        {/* Bank Details */}
        <div style={{ padding: '6px 8px', borderRight: '1.5px solid #000000' }}>
          <p style={{ fontWeight: 'bold', fontSize: '10px', margin: '0 0 2px 0' }}>Bank Details :</p>
          <p style={{ margin: '1px 0' }}><span style={{ fontWeight: 'bold' }}>Bank Name :</span> Indian Bank</p>
          <p style={{ margin: '1px 0' }}><span style={{ fontWeight: 'bold' }}>A/c Holder Name :</span> M/S SHAHIN STEEL FURNITURE</p>
          <p style={{ margin: '1px 0' }}><span style={{ fontWeight: 'bold' }}>A/c No :</span> 5044458515</p>
          <p style={{ margin: '1px 0' }}><span style={{ fontWeight: 'bold' }}>IFSC Code :</span> IDIB000C123</p>
          <p style={{ margin: '1px 0' }}><span style={{ fontWeight: 'bold' }}>Type of A/c :</span> Current Account</p>
        </div>

        {/* Tax Summary Table */}
        <div style={{ padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <table style={{ border: '1px solid #000000', textAlign: 'center', fontSize: '9px', borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000000', fontWeight: 'bold', backgroundColor: '#f3f4f6' }}>
                <th style={{ borderRight: '1px solid #000000', padding: '2px 4px' }}>Taxable Value</th>
                <th style={{ borderRight: '1px solid #000000', padding: '2px 4px' }}>CGST</th>
                <th style={{ borderRight: '1px solid #000000', padding: '2px 4px' }}>SGST</th>
                <th style={{ borderRight: '1px solid #000000', padding: '2px 4px' }}>IGST</th>
                <th style={{ padding: '2px 4px' }}>Grand Total</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ fontWeight: 'bold' }}>
                <td style={{ borderRight: '1px solid #000000', padding: '4px' }}>{fmt(taxableTotal)}</td>
                <td style={{ borderRight: '1px solid #000000', padding: '4px' }}>{fmt(cgstTotal)}</td>
                <td style={{ borderRight: '1px solid #000000', padding: '4px' }}>{fmt(sgstTotal)}</td>
                <td style={{ borderRight: '1px solid #000000', padding: '4px' }}>{fmt(igstTotal)}</td>
                <td style={{ padding: '4px', fontWeight: '900', fontSize: '10.5px' }}>Rs. {fmt(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. Total Values & Terms and Conditions (2 Columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1.5px solid #000000', fontSize: '10px' }}>
        {/* Left Column: Total in Figures & Words */}
        <div style={{ borderRight: '1.5px solid #000000', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ padding: '4px 8px', borderBottom: '1px solid #000000', fontWeight: 'bold' }}>
            Total Invoice Value (In figures) : Rs. {fmt(grandTotal)}
          </div>
          <div style={{ padding: '4px 8px', fontWeight: 'bold', lineHeight: 1.3 }}>
            Total Invoice Value (In words) : {numberToWords(grandTotal)}
          </div>
        </div>

        {/* Right Column: E. & O.E Terms */}
        <div style={{ padding: '4px 8px', fontSize: '9px', lineHeight: 1.3 }}>
          <p style={{ fontWeight: 'bold', margin: '0 0 2px 0' }}>E. &amp; O.E</p>
          <p style={{ margin: '1px 0' }}>1. Goods once sold cannot be returned.</p>
          <p style={{ margin: '1px 0' }}>2. 18% Interest charged after due date.</p>
          <p style={{ margin: '1px 0' }}>3. Subject to Bokaro Jurisdiction.</p>
        </div>
      </div>

      {/* 9. Signatures Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '6px 8px', fontSize: '10px' }}>
        {/* Receiver's Signature Box */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
          <div style={{ width: '130px', height: '36px', border: '1px solid #000000', marginBottom: '3px', backgroundColor: '#ffffff' }}></div>
          <p style={{ fontWeight: 'bold', fontSize: '9.5px', margin: 0, paddingLeft: '4px' }}>Receiver's Signature</p>
        </div>

        {/* Authorised Signatory */}
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <p style={{ fontWeight: 'bold', fontSize: '10.5px', margin: 0 }}>For M/S SHAHIN STEEL FURNITURE</p>
          <div style={{ paddingTop: '28px' }}>
            <div style={{ width: '170px', borderBottom: '1.5px solid #000000', marginLeft: 'auto', marginBottom: '3px' }}></div>
            <p style={{ fontWeight: 'bold', fontSize: '10.5px', margin: 0, paddingRight: '8px' }}>Authorised Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxInvoiceTemplate;
