'use client';

import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import type { XReadingData } from './x-reading-types';

interface XReadingReportViewProps {
  data: XReadingData;
  onPrint: () => Promise<void>;
}

export function XReadingReportView({ data, onPrint }: XReadingReportViewProps) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2 border-b pb-6">
        <h2 className="text-xl font-bold uppercase">{data.businessName || 'POS SYSTEM'}</h2>
        {data.operatedBy && <p className="text-sm">Operated by: {data.operatedBy}</p>}
        {data.address && <p className="text-sm">{data.address}</p>}
        {data.tin && <p className="text-sm">VAT REG TIN: {data.tin}</p>}
        {(data.contactNumber || data.email) && (
          <p className="text-sm">
            {data.contactNumber} {data.email && `| ${data.email}`}
          </p>
        )}
        <div className="pt-4">
          <h1 className="text-2xl font-bold">X-READING REPORT</h1>
        </div>
        <div className="text-sm text-muted-foreground space-y-1 pt-2">
          <p>Report Date: {format(new Date(data.reportDate), 'PPP')}</p>
          <p>Report Time: {format(new Date(data.reportDate), 'p')}</p>
          <p>Cashier: {data.cashierName} ({data.terminalId})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-sm">
        <div className="space-y-1">
          <p className="flex justify-between"><span>Shift Start:</span> <span>{data.shiftStart ? format(new Date(data.shiftStart), 'MM/dd/yy p') : '-'}</span></p>
          <p className="flex justify-between"><span>Shift End:</span> <span>{data.shiftEnd ? format(new Date(data.shiftEnd), 'MM/dd/yy p') : 'Active'}</span></p>
        </div>
        <div className="space-y-1">
          <p className="flex justify-between"><span>Terminal ID:</span> <span>{data.terminalId}</span></p>
          <p className="flex justify-between"><span>Status:</span> <span className="capitalize">{data.shiftStatus}</span></p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-6 border rounded-lg space-y-4">
          <h2 className="font-semibold text-xl">Sales Summary</h2>
          <div className="flex justify-between text-sm"><span>Gross Sales:</span> <span className="font-mono">₱{data.grossSales.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm text-destructive"><span>Returns:</span> <span className="font-mono">₱{data.returns.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm text-destructive"><span>Discounts:</span> <span className="font-mono">₱{data.discounts.toFixed(2)}</span></div>
          <Separator />
          <div className="flex justify-between font-bold text-lg"><span>Net Sales:</span> <span className="font-mono">₱{data.netSales.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm text-muted-foreground"><span>VAT (12%):</span> <span className="font-mono">₱{data.vatAmount.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm text-muted-foreground"><span>Transaction Count:</span> <span className="font-mono">{data.transactionCount}</span></div>
        </div>

        <div className="p-6 border rounded-lg space-y-4">
          <h2 className="font-semibold text-xl">Payment Breakdown</h2>
          {data.paymentMethods.map((method: any) => (
            <div key={method.name} className="flex justify-between text-sm">
              <span>{method.name}:</span>
              <span className="font-mono">₱{method.amount.toFixed(2)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between font-bold"><span>Total Payments:</span> <span className="font-mono">₱{data.paymentMethods.reduce((acc: number, m: any) => acc + m.amount, 0).toFixed(2)}</span></div>
        </div>

        <div className="p-6 border rounded-lg space-y-4">
          <h2 className="font-semibold text-xl">Cash Summary</h2>
          <div className="flex justify-between text-sm"><span>Starting Cash:</span> <span className="font-mono">₱{data.startingCash.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span>Cash Sales:</span> <span className="font-mono">₱{data.cashSales.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span>Cash Received (-) / Paid (+):</span> <span className="font-mono">₱0.00</span></div>
          <Separator />
          <div className="flex justify-between font-bold"><span>Expected Cash in Drawer:</span> <span className="font-mono">₱{data.cashInDrawer.toFixed(2)}</span></div>
        </div>

        <div className="pt-12 pb-8 space-y-12">
          <div className="grid grid-cols-2 gap-12 text-center">
            <div className="space-y-1">
              <div className="border-b border-black w-48 mx-auto h-8"></div>
              <p className="text-sm font-bold uppercase">{data.cashierName || 'Cashier'}</p>
              <p className="text-xs text-muted-foreground">(Cashier Signature)</p>
            </div>
            <div className="space-y-1">
              <div className="border-b border-black w-48 mx-auto h-8"></div>
              <p className="text-sm font-bold uppercase">MANAGER</p>
              <p className="text-xs text-muted-foreground">(Manager Signature)</p>
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm italic text-muted-foreground">End of X-Reading Report</p>
            <p className="text-lg font-bold">THIS IS NOT AN OFFICIAL RECEIPT</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center space-x-4">
        <Button size="lg" onClick={onPrint}>
          <Printer className="mr-2 h-5 w-5" /> Print X-Reading
        </Button>
      </div>
    </div>
  );
}
