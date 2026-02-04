import { format } from 'date-fns';

export type XReadingData = {
  id: string;
  date: string;
  reportDate: string;
  shiftStart: string | null;
  shiftEnd: string | null;
  grossSales: number;
  returns: number;
  discounts: number;
  netSales: number;
  vatAmount: number;
  paymentMethods: Array<{ name: string; amount: number }>;
  transactionCount: number;
  startingCash: number;
  cashSales: number;
  cashInDrawer: number;
  cashierName: string;
  cashierId: string;
  terminalId: string;
  shiftStatus: string;
  // Extended properties for the cash count detailed view
  cashCountId?: string;
  cashDenominations?: Array<{
    amount: number;
    qty: number;
    total: number;
  }>;
  cashDeposit?: number;
  cashPickup?: number;
  cashCountTotal?: number;
  overShort?: number;
  readingNumber?: string;
};

type PrinterFormat = '58mm' | '80mm';

export type BusinessSettings = {
  businessName: string;
  address: string;
  contactNumber: string;
  tin: string;
};

interface XReadingPreviewProps {
  data: XReadingData;
  printerFormat?: PrinterFormat;
  businessSettings?: BusinessSettings | null;
}

export function XReadingPreview({ data, printerFormat = '80mm', businessSettings }: XReadingPreviewProps) {
  const is58mm = printerFormat === '58mm';
  
  // Tailwind doesn't support mm widths by default, but we can use style or closest px. 
  // 80mm is approx 300px, 58mm is approx 220px. 
  // Updated to match print-x-reading.ts: 80mm->58mm (~219px), 58mm->38mm (~143px)
  const widthClass = is58mm ? 'w-[143px]' : 'w-[219px]';
  // Updated fonts to 10px / 9px
  const fontSize = is58mm ? 'text-[9px]' : 'text-[10px]'; 
  const headerSize = is58mm ? 'text-[11px]' : 'text-[11px]';

  // Helper for dashed line
  const DashedLine = () => (
    <div className="w-full border-t border-dashed border-black my-1" />
  );

  const formatCurrency = (amount: number) => 
    amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className={`${widthClass} mx-auto bg-white text-black font-mono leading-tight p-0 overflow-hidden`} style={{ fontFamily: '"Arial", "Helvetica", sans-serif', width: is58mm ? '38mm' : '58mm' }}>
      
      {/* Business Header */}
      <div className="text-center mb-2">
        <div className="font-bold text-sm">{businessSettings?.businessName || 'MY BUSINESS'}</div>
        <div className={fontSize}>{businessSettings?.address}</div>
        <div className={fontSize}>{businessSettings?.contactNumber}</div>
        <div className={fontSize}>VAT REG TIN: {businessSettings?.tin}</div>
      </div>

      <div className={`text-center ${headerSize} py-1 uppercase font-bold`}>
        X-READING REPORT
      </div>

      <DashedLine />
      
      {/* Header Info */}
      <div className={`${fontSize} uppercase mb-1 space-y-0.5`}>
        <div className="flex justify-between items-start">
          <span className="w-24 shrink-0">Cashier:</span>
          <span className="text-right break-words w-full">{data.cashierName}</span>
        </div>
        <div className="flex justify-between items-start">
          <span className="w-24 shrink-0">Terminal:</span>
          <span className="text-right break-words w-full">{data.terminalId}</span>
        </div>
        <div className="flex justify-between items-start">
          <span className="w-24 shrink-0">Reading #:</span>
          <span className="text-right break-words w-full">{data.readingNumber || data.id.substring(0, 8).toUpperCase()}</span>
        </div>
        <div className="flex justify-between mt-1 items-start">
          <span>Start shift</span>
          <span className="text-right">{data.shiftStart ? format(new Date(data.shiftStart), 'MM/dd/yyyy hh:mm a') : '-'}</span>
        </div>
        <div className="flex justify-between items-start">
          <span>End shift</span>
          <span className="text-right">{data.shiftEnd ? format(new Date(data.shiftEnd), 'MM/dd/yyyy hh:mm a') : '-'}</span>
        </div>
      </div>

      <DashedLine />

      {/* Sales Summary */}
      <div className={`${fontSize} uppercase space-y-1`}>
         <div className="flex justify-between font-bold">
            <span>Gross Sales</span>
            <span>{formatCurrency(data.grossSales)}</span>
         </div>
         <div className="flex justify-between">
            <span>Less: Returns</span>
            <span>{formatCurrency(data.returns)}</span>
         </div>
         <div className="flex justify-between">
            <span>Less: Discounts</span>
            <span>{formatCurrency(data.discounts)}</span>
         </div>
         <div className="flex justify-between font-bold border-t border-dashed border-black pt-1">
             <span>Net Sales</span>
             <span>{formatCurrency(data.netSales)}</span>
         </div>
      </div>

      <DashedLine />
      
      {/* VAT Analysis (Simplified) */}
      <div className={`${fontSize} uppercase space-y-1`}>
         <div className="flex justify-between">
            <span>VAT Amount</span>
            <span>{formatCurrency(data.vatAmount)}</span>
         </div>
      </div>

       <DashedLine />

      {/* Payments */}
      <div className={`${fontSize} uppercase space-y-1`}>
         <div className="font-bold mb-1">Payments</div>
         {data.paymentMethods.map((pm, idx) => (
             <div key={idx} className="flex justify-between">
                 <span>{pm.name}</span>
                 <span>{formatCurrency(pm.amount)}</span>
             </div>
         ))}
         <div className="flex justify-between font-bold border-t border-dashed border-black pt-1">
             <span>Total Tendered</span>
             <span>{formatCurrency(data.paymentMethods.reduce((a, b) => a + b.amount, 0))}</span>
         </div>
      </div>

      <DashedLine />

      {/* Cash Breakdown (Denominations) */}
      <div className={`${fontSize} uppercase`}>
        <div className="font-bold text-center mb-1">CASH COUNT DETAILS</div>
        <div className="flex justify-between mb-1 text-[9px]">
          <div className="w-1/3 text-left">Denom</div>
          <div className="w-1/3 text-center">Qty</div>
          <div className="w-1/3 text-right">Total</div>
        </div>
        
        {data.cashDenominations && data.cashDenominations.length > 0 ? (
           data.cashDenominations.map((denom, index) => (
            <div key={index} className="flex justify-between">
              <div className="w-1/3 text-left">{denom.amount === 0.25 || denom.amount === 0.1 || denom.amount === 0.05 ? denom.amount.toFixed(2) : denom.amount.toString()}</div>
              <div className="w-1/3 text-center">{denom.qty}</div>
              <div className="w-1/3 text-right">{formatCurrency(denom.total)}</div>
            </div>
           ))
        ) : (
            // Default Denominations as empty template
            [1000, 500, 200, 100, 50, 20, 10, 5, 1, 0.25].map((val) => (
                <div key={val} className="flex justify-between text-gray-400">
                    <div className="w-1/3 text-left">{val >= 1 ? val.toFixed(0) : val.toFixed(2)}</div>
                    <div className="w-1/3 text-center">-</div>
                    <div className="w-1/3 text-right">0.00</div>
                </div>
            ))
        )}
      </div>

      <DashedLine />

      {/* Cash Summary */}
      <div className={`text-center ${headerSize} py-1 uppercase font-bold`}>
        CASH SUMMARY
      </div>
      
      <div className={`${fontSize} uppercase space-y-1`}>
        <div className="flex justify-between">
            <span>Opening Fund</span>
            <span>{formatCurrency(data.startingCash)}</span>
        </div>
        <div className="flex justify-between">
            <span>+ Cash Sales</span>
            <span>{formatCurrency(data.cashSales)}</span>
        </div>
        <div className="flex justify-between">
            <span>+ Cash Deposit</span>
            <span>{formatCurrency(data.cashDeposit || 0)}</span>
        </div>
        <div className="flex justify-between">
            <span>- Cash Pick Up</span>
            <span>{formatCurrency(data.cashPickup || 0)}</span>
        </div>
        
        <div className="flex justify-between font-bold border-t border-dashed border-black pt-1">
             <span>Expected Cash</span>
             <span>{formatCurrency(data.startingCash + data.cashSales + (data.cashDeposit || 0) - (data.cashPickup || 0))}</span>
         </div>

        <div className="flex justify-between font-bold">
            <span>Actual Count</span>
            <span>{formatCurrency(data.cashCountTotal || 0)}</span>
        </div>
        
        <DashedLine />

        <div className="flex justify-between font-bold text-xs">
            <span>{data.overShort && data.overShort >= 0 ? 'OVERAGE' : 'SHORTAGE'}</span>
            <span>{formatCurrency(Math.abs(data.overShort || 0))}</span>
        </div>
      </div>

      <DashedLine />
      
      {/* Footer */}
      <div className="text-center mt-4 space-y-4">
        <div className={`${fontSize}`}>
             _______________________<br/>
             Cashier Signature
        </div>
        <div className={`${fontSize}`}>
             _______________________<br/>
             Manager Signature
        </div>
        <div className={`${fontSize} mt-2`}>
             Printed: {format(new Date(), 'MM/dd/yyyy hh:mm a')}
        </div>
      </div>

    </div>
  );
}
