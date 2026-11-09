import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';

const EmiReceiptModal = ({ installment, customerName, invoiceNumber, isOpen, onClose }) => {
  if (!isOpen || !installment) return null;

  const handlePrint = () => {
    window.print();
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Controls */}
        <div className="no-print bg-[#211F1C] text-white px-5 py-3 flex items-center justify-between">
          <span className="text-xs font-bold text-[#C49A6C]">Customer EMI Payment Receipt</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C49A6C] text-[#211F1C] font-bold text-xs hover:bg-[#dfb76c]"
            >
              <Printer size={14} /> Print Receipt
            </button>
            <button onClick={onClose} className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Slip */}
        <div className="p-6 text-[#211F1C] bg-white">
          <div className="text-center border-b border-[#E5E2DE] pb-4 mb-4">
            <h2 className="font-serif text-xl font-bold tracking-tight">SHAHIN STEEL FURNITURE</h2>
            <p className="text-[10px] text-[#71717A] uppercase tracking-wider">Main Road Overbridge, Ranchi, Jharkhand</p>
            <span className="inline-block mt-2 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase rounded-full">
              Official EMI Receipt
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#F0ECE4]">
              <span className="text-[#71717A]">Receipt No:</span>
              <span className="font-bold">{installment.receipt_number || 'REC-EMI-PENDING'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F0ECE4]">
              <span className="text-[#71717A]">Customer:</span>
              <span className="font-bold">{customerName || 'Valued Customer'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F0ECE4]">
              <span className="text-[#71717A]">Linked Sales Invoice:</span>
              <span className="font-medium">{invoiceNumber || 'SSF-SALE'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F0ECE4]">
              <span className="text-[#71717A]">Installment Number:</span>
              <span className="font-bold">Installment #{installment.installment_number}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F0ECE4]">
              <span className="text-[#71717A]">Payment Date:</span>
              <span>{installment.paid_date || new Date().toISOString().slice(0, 10)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F0ECE4]">
              <span className="text-[#71717A]">Payment Mode:</span>
              <span className="font-bold uppercase text-[#C49A6C]">{installment.payment_mode || 'CASH'}</span>
            </div>
            {installment.transaction_ref && (
              <div className="flex justify-between py-1 border-b border-[#F0ECE4]">
                <span className="text-[#71717A]">Transaction Ref:</span>
                <span className="font-mono text-[11px]">{installment.transaction_ref}</span>
              </div>
            )}
            <div className="flex justify-between py-3 text-base font-extrabold text-[#211F1C] border-t-2 border-[#211F1C] mt-2">
              <span>Amount Paid:</span>
              <span className="text-emerald-700">{fmt(installment.paid_amount || installment.installment_amount)}</span>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-[#E5E2DE] flex justify-between items-center text-[10px] text-[#71717A]">
            <p>Generated via Shahin Cloud Management</p>
            <div className="text-right">
              <div className="w-24 border-b border-[#211F1C] mb-1"></div>
              <p className="font-bold text-[#211F1C]">Cashier / Accountant</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmiReceiptModal;

