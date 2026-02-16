'use client';

import { format } from 'date-fns';

export type ZReadingData = {
  id: string;
  date: string;
  reportDate: Date;
  grossSales: number;
  returns: number;
  discounts: number;
  netSales: number;
  vatSales: number;
  vatAmount: number;
  vatExempt: number;
  zeroRated: number;
  nonVat: number;
  paymentMethods: Array<{ name: string; amount: number }>;
  transactionCount: number;
  startingCash: number;
  cashSales: number;
  cashInDrawer: number;
  cashierName?: string;
  terminalId?: string;
  minSaleId?: string;
  maxSaleId?: string;
  previousReading?: number;
  runningTotal?: number;
};

type PrinterFormat = '58mm' | '80mm';


export type BusinessSettings = {
  businessName: string;
  address: string;
  contactNumber: string;
  tin: string;
  logoPath?: string;
};

interface ZReadingPreviewProps {
  data: ZReadingData;
  printerFormat: PrinterFormat;
  businessSettings: BusinessSettings | null;
}

export function ZReadingPreview({ data, printerFormat, businessSettings }: ZReadingPreviewProps) {
  const is58mm = printerFormat === '58mm';
  


  // 80mm is approx 300px (safety margin -> 290px), 58mm is approx 219px.
  // We reduce 58mm to 190px to account for potentially large printer margins (approx 50mm printable area).
  const widthClass = is58mm ? 'w-[190px]' : 'w-[290px]'; 
  const fontSize = 'text-[11px]'; 
  const headerSize = 'text-[12px]';

  // Helper for dashed line
  const DashedLine = () => (
    <div className="w-full border-t border-dashed border-black my-1" />
  );

  const formatCurrency = (amount: number) => 
    amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const reportDate = new Date(data.reportDate);
  const startTime = new Date(data.reportDate); 
  // In a real scenario, start time would be the end time of previous Z-Reading or shift start. 
  // For now we use reportDate set to 00:00 or similar if available, or just same day 
  startTime.setHours(9, 0, 0, 0); // Mock 9 AM start
  
  const minSi = data.minSaleId || '0000000000001';
  const maxSi = data.maxSaleId || '0000000000001';

  return (
    <div 
        className={`${widthClass} mx-auto bg-white text-black font-mono leading-tight p-2`} 
        style={{ 
            fontFamily: '"Courier New", Courier, monospace',
            color: 'black', 
            backgroundColor: 'white',
            border: process.env.NODE_ENV === 'development' ? '1px dotted lightgray' : 'none' // Debug visual
        }}
    >
      {/* Business Header */}
      <div className="text-center mb-4 font-bold">
        <div className={`${headerSize} uppercase`}>{businessSettings?.businessName || 'NICOLE\'S SUPERMARKET'}</div>
        <div className={fontSize}>Operated by: Facunla Enterprise Inc.</div>
        <div className={fontSize}>{businessSettings?.address || 'Ground Floor Jade Bldg., Jennalyn Ave., Brgy. Abogado, Paniqui, Tarlac'}</div>
        <div className={fontSize}>VAT REG TIN: {businessSettings?.tin || '123-456-789-00000'}</div>
        <div className={fontSize}>MIN: 1234567890</div>
        <div className={fontSize}>S/N: 0987654321-11</div>
      </div>

      <div className="text-center mb-2 font-bold">
        <div className={headerSize}>Z-READING REPORT</div>
      </div>

      <div className={`${fontSize} mb-2`}>
        <div className="flex justify-between">
          <span>Report Date:</span>
          <span>{format(reportDate, 'MMMM d, yyyy')}</span>
        </div>
        <div className="flex justify-between">
          <span>Report Time:</span>
          <span>{format(reportDate, 'h:mm a')}</span>
        </div>
        <br/>
        <div className="flex justify-between">
          <span>Start Date & Time:</span>
          <span>{format(startTime, 'MM/dd/yy h:mm a')}</span>
        </div>
        <div className="flex justify-between">
          <span>End Date & Time:</span>
          <span>{format(reportDate, 'MM/dd/yy h:mm a')}</span>
        </div>
      </div>

      <div className={`${fontSize} mb-2`}>
        <div className="flex justify-between">
          <span>Beg. SI #:</span>
          <span>{minSi}</span>
        </div>
        <div className="flex justify-between">
          <span>End. SI #:</span>
          <span>{maxSi}</span>
        </div>
        <div className="flex justify-between">
          <span>Beg. VOID #:</span>
          <span>0000000000001</span>
        </div>
         <div className="flex justify-between">
          <span>End. VOID #:</span>
          <span>0000000000001</span>
        </div>
         <div className="flex justify-between">
          <span>Beg. RETURN #:</span>
          <span>0000000000000</span>
        </div>
         <div className="flex justify-between">
          <span>End. RETURN #:</span>
          <span>0000000000000</span>
        </div>
        <br />
         <div className="flex justify-between">
          <span>Reset Counter No.</span>
          <span>0</span>
        </div>
         <div className="flex justify-between">
          <span>Z Counter No. :</span>
          <span>1</span>
        </div>
      </div>

      <DashedLine />

      <div className={`${fontSize} mb-1`}>
        <div className="flex justify-between">
          <span>Present Accumulated Sales:</span>
          <span>{formatCurrency(data.netSales)}</span> 
        </div>
         <div className="flex justify-between">
          <span>Previous Accumulated Sales:</span>
          <span>{formatCurrency(data.previousReading || 0)}</span>
        </div>
         <div className="flex justify-between font-bold">
          <span>Sales for the Day:</span>
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
          <span>{formatCurrency(data.vatSales)}</span>
        </div>
         <div className="flex justify-between">
          <span>VAT AMOUNT:</span>
          <span>{formatCurrency(data.vatAmount)}</span>
        </div>
         <div className="flex justify-between">
          <span>VAT EXEMPT SALES:</span>
          <span>{formatCurrency(data.vatExempt)}</span>
        </div>
         <div className="flex justify-between">
          <span>ZERO RATED SALES:</span>
          <span>{formatCurrency(data.zeroRated)}</span>
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
         <div className="flex justify-between">
          <span>Less Void:</span>
          <span>0.00</span>
        </div>
         <div className="flex justify-between">
          <span>Less VAT Adjustment:</span>
          <span>0.00</span>
        </div>
         <div className="flex justify-between font-bold mt-1">
          <span>Net Amount:</span>
          <span>{formatCurrency(data.netSales)}</span>
        </div>
      </div>

       <DashedLine />

       <div className="text-center mb-1">
        <div className={fontSize}>DISCOUNT SUMMARY</div>
      </div>
      
       <div className={`${fontSize} mb-1`}>
         <div className="flex justify-between">
          <span>SC Disc. :</span>
          <span>0.00</span>
        </div>
         <div className="flex justify-between">
          <span>PWD Disc. :</span>
          <span>0.00</span>
        </div>
         <div className="flex justify-between">
          <span>NAAC Disc. :</span>
          <span>0.00</span>
        </div>
         <div className="flex justify-between">
          <span>Solo Parent Disc. :</span>
          <span>0.00</span>
        </div>
         <div className="flex justify-between">
          <span>Other Disc. :</span>
          <span>{formatCurrency(data.discounts)}</span>
        </div>
      </div>

      <DashedLine />

       <div className="text-center mb-1">
        <div className={fontSize}>SALES ADJUSTMENT</div>
      </div>

       <div className={`${fontSize} mb-1`}>
         <div className="flex justify-between">
          <span>VOID :</span>
          <span>0.00</span>
        </div>
         <div className="flex justify-between">
          <span>RETURN :</span>
          <span>{formatCurrency(data.returns)}</span>
        </div>
      </div>

      <DashedLine />

      <div className="text-center mb-1">
        <div className={fontSize}>VAT ADJUSTMENT</div>
      </div>

      <div className={`${fontSize} mb-1`}>
         <div className="flex justify-between">
          <span>SC TRANS. :</span>
          <span>0.00</span>
        </div>
         <div className="flex justify-between">
          <span>PWD TRANS :</span>
          <span>0.00</span>
        </div>
         <div className="flex justify-between">
          <span>REG.Disc. TRANS :</span>
          <span>0.00</span>
        </div>
         <div className="flex justify-between">
          <span>ZERO-RATED TRANS.:</span>
          <span>0.00</span>
        </div>
         <div className="flex justify-between">
          <span>VAT on Return:</span>
          {/* Approximate VAT on Return if known, otherwise placeholders */}
          <span>0.00</span>
        </div>
         <div className="flex justify-between">
          <span>Other VAT Adjustments</span>
          <span>0.00</span>
        </div>
      </div>

      <DashedLine />

      <div className="text-center mb-1">
        <div className={fontSize}>TRANSACTION SUMMARY</div>
      </div>
      
       <div className={`${fontSize} mb-1`}>
         {(data.paymentMethods || []).map(method => (
             <div key={method.name} className="flex justify-between">
              <span className="uppercase">{method.name}:</span>
              <span>{formatCurrency(method.amount)}</span>
            </div>
         ))}
         
         <div className="flex justify-between">
            <span>Opening Fund:</span>
            <span>{formatCurrency(data.startingCash)}</span>
         </div>
          <div className="flex justify-between">
            <span>Less Withdrawal:</span>
            <span>0.00</span>
         </div>
          <div className="flex justify-between font-bold mt-1">
             <span>Payments Received:</span>
             {/* Total Payments */}
            <span>{formatCurrency((data.paymentMethods || []).reduce((acc, m) => acc + m.amount, 0))}</span>
         </div>
      </div>

      <DashedLine />
      
       <div className={`${fontSize} mb-1`}>
         <div className="flex justify-between">
          <span>SHORT/OVER:</span>
          <span>0.00</span>
        </div>
      </div>

      <DashedLine />
      
      <div className="mt-8 mb-8 text-center">
        <div className={fontSize}>This Receipt shall be valid for</div>
        <div className={fontSize}>five (5) years from the date of</div>
        <div className={fontSize}>the permit to use.</div>
      </div>
    
      <div className="text-center font-bold">
         <div className={fontSize}>THIS IS NOT AN OFFICIAL RECEIPT</div>
      </div>

    </div>
  );
}
