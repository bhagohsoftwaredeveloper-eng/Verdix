'use client';

import { format } from 'date-fns';

type ZReadingData = {
  id: string;
  date: string;
  reportDate: Date;
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
  cashierName?: string;
  terminalId?: string;
};

type PrinterFormat = '58mm' | '80mm';

interface ZReadingPreviewProps {
  data: ZReadingData;
  printerFormat: PrinterFormat;
}

export function ZReadingPreview({ data, printerFormat }: ZReadingPreviewProps) {
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
      {/* Business Header */}
      <div className="text-center mb-4 uppercase">
        <h1 className={`${headerSize} font-bold`}>BUSINESS NAME</h1>
        <p className={fontSize}>Purok sto. Nino, Bunao Quezon City</p>
      </div>

      {/* Info Line */}
      <div className={`${fontSize} flex justify-between uppercase mb-1`}>
        <span>Terminal:{data.terminalId || 'Counter 1'}</span>
        <span>Date:{format(new Date(data.reportDate), 'MM/dd/yyyy')}</span>
      </div>

      {/* Transaction Summary Line */}
      <div className={`${fontSize} uppercase mb-1`}>
        <div>Transaction summary:</div>
        <div>00000000000-00000000000</div>
      </div>

      <DashedLine />

      {/* Sales Breakdown */}
      <div className={`${fontSize} space-y-1 uppercase`}>
        <div className="flex justify-between">
          <span>GROSS SALES</span>
          <span>{formatCurrency(data.grossSales)}</span>
        </div>
        <div className="flex justify-between">
          <span>RETURNS</span>
          <span>{formatCurrency(data.returns)}</span>
        </div>
        <div className="flex justify-between">
          <span>REGULAR DISCOUNT</span>
          <span>{formatCurrency(data.discounts)}</span>
        </div>
        <div className="flex justify-between">
          <span>SENIOR DISCOUNT</span>
          <span>0.00</span>
        </div>
        <div className="flex justify-between">
          <span>PWD DISCOUNT</span>
          <span>0.00</span>
        </div>
        
        <div className="my-1"></div>

        <div className="flex justify-between">
          <span>NET SALES</span>
          <span>{formatCurrency(data.netSales)}</span>
        </div>

        <div className="my-1"></div>

        <div className="flex justify-between">
          <span>VAT SALES</span>
          {/* Assuming Net Sales is VAT Sales if all vatable, or need separation. Using Net Sales for now or 0 if not calculated */}
          <span>{formatCurrency(data.netSales - data.vatAmount)}</span> 
        </div>
        <div className="flex justify-between">
          <span>12% VAT</span>
          <span>{formatCurrency(data.vatAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span>VAT-EXEMPT SALES</span>
          <span>0.00</span>
        </div>
         <div className="flex justify-between">
          <span>ZERO-RATED SALES</span>
          <span>0.00</span>
        </div>
        <div className="flex justify-between">
          <span>NON-VAT SALES</span>
          <span>0.00</span>
        </div>
      </div>

      <div className="my-2">
         <DashedLine />
         <div className={`text-center ${headerSize} py-1 uppercase`}>TERMINAL CASH POSITION</div>
         <DashedLine />
         <div className={`text-center ${headerSize} py-1 uppercase`}>CASHIERS CASH POSITION</div>
      </div>
      
      {/* Cashier Stats */}
      <div className={`${fontSize} space-y-1 uppercase`}>
        <div className="flex justify-between">
          <span>NO. OF TRANSACTIONS</span>
          <span>{data.transactionCount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>PREVIOUS READING</span>
          <span>0.00</span> 
        </div>
        <div className="flex justify-between">
          <span>NET SALES</span>
          <span>{formatCurrency(data.netSales)}</span>
        </div>
        <div className="flex justify-between">
          <span>RUNNING TOTAL</span>
          {/* Previous + Net */}
          <span>{formatCurrency(data.netSales)}</span>
        </div>
      </div>
      
      <div className="mt-8 mb-4 text-center">
        <div className={fontSize}>NenApps Business Software Provider</div>
        <div className={fontSize}>Cebu City</div>
      </div>
      
      <DashedLine />
    </div>
  );
}
