
import { format } from 'date-fns';
import { BusinessSettings } from '../z-reading/z-reading-preview';

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

interface XReadingPreviewProps {
  data: XReadingData;
  printerFormat?: PrinterFormat;
  businessSettings?: BusinessSettings | null;
}

export function XReadingPreview({ data, printerFormat = '80mm', businessSettings }: XReadingPreviewProps) {
  const is58mm = printerFormat === '58mm';
  
  // Adjusted widths to match ZReadingPreview's logic roughly
  const widthClass = is58mm ? 'w-[280px]' : 'w-[360px]';
  const fontSize = 'text-[11px]'; 
  const headerSize = 'text-[12px]';

  // Helper for dashed line
  const DashedLine = () => (
    <div className="w-full border-t border-dashed border-black my-1" />
  );

  const formatCurrency = (amount: number) => 
    amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Calculate generic fields if missing
  const vatableSales = data.netSales / 1.12;
  const vatExempt = 0; // Placeholder
  const zeroRated = 0; // Placeholder
  const nonVat = 0; // Placeholder

  return (
    <div className={`${widthClass} mx-auto bg-white text-black font-mono leading-tight p-4`} style={{ fontFamily: '"Courier New", Courier, monospace' }}>
      
      {/* Business Header */}
      <div className="text-center mb-4 font-bold">
        <div className={`${headerSize} uppercase`}>{businessSettings?.businessName || 'MY BUSINESS'}</div>
        <div className={fontSize}>Operated by: {businessSettings?.businessName || 'Business Owner'}</div>
        <div className={fontSize}>{businessSettings?.address || 'Address'}</div>
        <div className={fontSize}>VAT REG TIN: {businessSettings?.tin || '000-000-000-000'}</div>
      </div>

      <div className="text-center mb-2 font-bold">
        <div className={headerSize}>X-READING REPORT</div>
      </div>

      <div className={`${fontSize} mb-2`}>
        <div className="flex justify-between">
            <span>Reading #:</span>
            <span>{data.readingNumber || data.id.substring(0, 8).toUpperCase()}</span>
        </div>
        <div className="flex justify-between">
          <span>Report Date:</span>
          <span>{format(new Date(), 'MMMM d, yyyy')}</span>
        </div>
        <div className="flex justify-between">
          <span>Report Time:</span>
          <span>{format(new Date(), 'h:mm a')}</span>
        </div>
        <br/>
        <div className="flex justify-between">
          <span>Start Shift:</span>
          <span>{data.shiftStart ? format(new Date(data.shiftStart), 'MM/dd/yy h:mm a') : '-'}</span>
        </div>
        <div className="flex justify-between">
          <span>End Shift:</span>
          <span>{data.shiftEnd ? format(new Date(data.shiftEnd), 'MM/dd/yy h:mm a') : 'Active'}</span>
        </div>
        <div className="flex justify-between">
            <span>Cashier:</span>
            <span>{data.cashierName}</span>
        </div>
        <div className="flex justify-between">
            <span>Terminal:</span>
            <span>{data.terminalId}</span>
        </div>
      </div>

      <DashedLine />

      <div className={`${fontSize} mb-1`}>
         <div className="flex justify-between font-bold">
          <span>Sales for the Shift:</span>
          <span>{formatCurrency(data.netSales)}</span>
        </div>
      </div>

      <DashedLine />

      <div className="text-center mb-1 font-bold">
        <div className={fontSize}>BREAKDOWN OF SALES</div>
      </div>

      <div className={`${fontSize} mb-1`}>
         <div className="flex justify-between">
          <span>VATABLE SALES :</span>
          <span>{formatCurrency(vatableSales)}</span>
        </div>
         <div className="flex justify-between">
          <span>VAT AMOUNT:</span>
          <span>{formatCurrency(data.vatAmount)}</span>
        </div>
         <div className="flex justify-between">
          <span>VAT EXEMPT SALES:</span>
          <span>{formatCurrency(vatExempt)}</span>
        </div>
         <div className="flex justify-between">
          <span>ZERO RATED SALES:</span>
          <span>{formatCurrency(zeroRated)}</span>
        </div>
      </div>

      <DashedLine />

      <div className={`${fontSize} mb-1`}>
         <div className="flex justify-between">
          <span>Gross Amount:</span>
          <span>{formatCurrency(data.grossSales)}</span>
        </div>
         <div className="flex justify-between">
          <span>Less Discount:</span>
          <span>{formatCurrency(data.discounts)}</span>
        </div>
         <div className="flex justify-between">
          <span>Less Return:</span>
          <span>{formatCurrency(data.returns)}</span>
        </div>
         <div className="flex justify-between font-bold mt-1">
          <span>Net Amount:</span>
          <span>{formatCurrency(data.netSales)}</span>
        </div>
      </div>

       <DashedLine />

       <div className="text-center mb-1">
        <div className={fontSize}>TRANSACTION SUMMARY</div>
      </div>
      
       <div className={`${fontSize} mb-1`}>
         {data.paymentMethods.map((method, idx) => (
             <div key={idx} className="flex justify-between">
              <span className="uppercase">{method.name}:</span>
              <span>{formatCurrency(method.amount)}</span>
            </div>
         ))}
         
          <div className="flex justify-between font-bold mt-1">
             <span>Total Payments:</span>
            <span>{formatCurrency(data.paymentMethods.reduce((acc, m) => acc + m.amount, 0))}</span>
         </div>
      </div>
      
      <DashedLine />

      {/* Cash Count Details - Kept from X-Reading specific reqs */}
      <div className="text-center mb-1 font-bold">
        <div className={fontSize}>CASH COUNT DETAILS</div>
      </div>
       <div className={`${fontSize} mb-1`}>
         <div className="flex justify-between underline mb-1">
            <span className="w-1/3 text-left">Denom</span>
            <span className="w-1/3 text-center">Qty</span>
            <span className="w-1/3 text-right">Total</span>
         </div>
         {(data.cashDenominations || []).map((d, i) => (
             <div key={i} className="flex justify-between">
                 <span className="w-1/3 text-left">{d.amount >= 1 ? d.amount : d.amount.toFixed(2)}</span>
                 <span className="w-1/3 text-center">{d.qty}</span>
                 <span className="w-1/3 text-right">{formatCurrency(d.total)}</span>
             </div>
         ))}
       </div>

       <DashedLine />

      <div className={`${fontSize} mb-1`}>
        <div className="flex justify-between">
          <span>Opening Fund:</span>
          <span>{formatCurrency(data.startingCash)}</span>
        </div>
        <div className="flex justify-between">
          <span>+ Cash Sales:</span>
          <span>{formatCurrency(data.cashSales)}</span>
        </div>
         <div className="flex justify-between">
          <span>+ Cash Deposit:</span>
          <span>{formatCurrency(data.cashDeposit || 0)}</span>
        </div>
         <div className="flex justify-between">
          <span>- Cash Pickup:</span>
          <span>{formatCurrency(data.cashPickup || 0)}</span>
        </div>
        <div className="flex justify-between font-bold mt-1">
          <span>Expected Cash:</span>
          <span>{formatCurrency(data.startingCash + data.cashSales + (data.cashDeposit || 0) - (data.cashPickup || 0))}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Actual Count:</span>
          <span>{formatCurrency(data.cashCountTotal || 0)}</span>
        </div>
      </div>

      <DashedLine />
      
       <div className={`${fontSize} mb-1 font-bold`}>
         <div className="flex justify-between">
          <span>{data.overShort && data.overShort >= 0 ? 'OVERAGE' : 'SHORTAGE'}:</span>
          <span>{formatCurrency(Math.abs(data.overShort || 0))}</span>
        </div>
      </div>

      <DashedLine />
      
      <div className="mt-8 mb-4 text-center">
         <div className={`${fontSize} mb-6`}>
             _______________________<br/>
             Cashier Signature
        </div>
        <div className={`${fontSize}`}>
             _______________________<br/>
             Manager Signature
        </div>
      </div>
    
      <div className="text-center font-bold">
         <div className={fontSize}>THIS IS NOT AN OFFICIAL RECEIPT</div>
      </div>

    </div>
  );
}
