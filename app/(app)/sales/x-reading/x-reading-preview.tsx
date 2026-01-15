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
};

type PrinterFormat = '58mm' | '80mm';

interface XReadingPreviewProps {
  data: XReadingData;
  printerFormat?: PrinterFormat;
}

export function XReadingPreview({ data, printerFormat = '80mm' }: XReadingPreviewProps) {
  const is58mm = printerFormat === '58mm';
  
  // Tailwind doesn't support mm widths by default, but we can use style or closest px. 
  // 80mm is approx 300px, 58mm is approx 220px. 
  const widthClass = is58mm ? 'w-[220px]' : 'w-[300px]';
  const fontSize = 'text-[10px]'; // Standard small thermal font
  const headerSize = 'text-[12px]';

  // Helper for dashed line
  const DashedLine = () => (
    <div className="w-full border-t border-dashed border-black my-1" />
  );

  const formatCurrency = (amount: number) => 
    amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className={`${widthClass} mx-auto bg-white text-black font-mono leading-tight p-2`} style={{ fontFamily: '"Courier New", Courier, monospace' }}>
      
      {/* Header Info */}
      <div className={`${fontSize} uppercase mb-1`}>
        <div className="flex">
          <span className="w-24">Cashier:</span>
          <span>{data.cashierName}</span>
        </div>
        <div className="flex">
          <span className="w-24">Terminal:</span>
          <span>{data.terminalId}</span>
        </div>
        <div className="flex">
          <span className="w-24">Cash count #:</span>
          <span>{data.cashCountId || data.id}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Start shift</span>
          <span>{data.shiftStart ? format(new Date(data.shiftStart), 'MM/dd/yyyy hh:mm a') : '-'}</span>
        </div>
        <div className="flex justify-between">
          <span>End shift</span>
          <span>{data.shiftEnd ? format(new Date(data.shiftEnd), 'MM/dd/yyyy hh:mm a') : '-'}</span>
        </div>
      </div>

      <DashedLine />

      {/* Cash Denominations Table */}
      <div className={`${fontSize} uppercase`}>
        <div className="flex justify-between mb-1">
          <div className="w-1/3 text-left">Cash</div>
          <div className="w-1/3 text-center">Qty</div>
          <div className="w-1/3 text-right">Total</div>
        </div>
        
        <DashedLine />

        {data.cashDenominations && data.cashDenominations.length > 0 ? (
           data.cashDenominations.map((denom, index) => (
            <div key={index} className="flex justify-between">
              <div className="w-1/3 text-left">{denom.amount === 0.25 || denom.amount === 0.1 || denom.amount === 0.05 ? denom.amount.toFixed(2) : denom.amount.toString()}</div>
              <div className="w-1/3 text-center">{denom.qty.toFixed(2)}</div>
              <div className="w-1/3 text-right">{formatCurrency(denom.total)}</div>
            </div>
           ))
        ) : (
            // Default Denominations if none provided (placeholder logic)
            [1000, 500, 200, 100, 50, 20, 10, 5, 1, 0.25, 0.10, 0.05].map((val) => (
                <div key={val} className="flex justify-between">
                    <div className="w-1/3 text-left">{val >= 1 ? val.toFixed(2) : val.toString()}</div>
                    <div className="w-1/3 text-center">0.00</div>
                    <div className="w-1/3 text-right">0.00</div>
                </div>
            ))
        )}
      </div>

      <DashedLine />

      {/* Grand Total */}
      <div className={`${fontSize} uppercase flex justify-between font-bold`}>
        <span>Grand total</span>
        <span>{formatCurrency(data.cashCountTotal || 0)}</span>
      </div>

      <DashedLine />

      {/* Cash Summary Header */}
      <div className={`text-center ${headerSize} py-1 uppercase`}>
        CASH SUMMARY
      </div>
      
      <div className={`${fontSize} uppercase space-y-1`}>
        <div className="flex justify-between">
            <span>Opening amount</span>
            <span>{formatCurrency(data.startingCash)}</span>
        </div>

        <DashedLine />

        <div className="flex justify-between">
            <span>Cash Deposit</span>
            <span>{formatCurrency(data.cashDeposit || 0)}</span>
        </div>
        <div className="flex justify-between">
            <span>Cash Pick Up</span>
            <span>{formatCurrency(data.cashPickup || 0)}</span>
        </div>
        <div className="flex justify-between">
            <span>Cash Count</span>
            <span>{formatCurrency(data.cashCountTotal || 0)}</span>
        </div>
         <div className="flex justify-between">
            <span>Cash Sales</span>
            <span>{formatCurrency(data.cashSales)}</span>
        </div>
        
        <DashedLine />

        <div className="flex justify-between font-bold">
            <span>Grand Total Count</span>
            <span>{formatCurrency(data.cashCountTotal || 0)}</span>
        </div>
        <div className="flex justify-between font-bold">
            <span>Over</span>
            <span>{formatCurrency(data.overShort || 0)}</span>
        </div>
      </div>

      <DashedLine />
      
      {/* Footer Title */}
      <div className={`text-center ${headerSize} py-1 uppercase`}>
        SHIFT REPORT
      </div>

    </div>
  );
}
