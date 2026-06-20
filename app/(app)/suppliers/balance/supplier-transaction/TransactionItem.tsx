'use client';

import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SupplierTransaction } from '../../actions';

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });

const STATUS_STYLES: Record<string, string> = {
  'Paid':           'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Partially Paid': 'bg-blue-50 text-blue-700 border-blue-200',
};

export function TransactionItem({ txn }: { txn: SupplierTransaction }) {
  const isPurchase = txn.type === 'PURCHASE';

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
      {/* Header row */}
      <div className={`flex items-center justify-between p-4 ${isPurchase ? 'bg-muted/30' : 'bg-emerald-50 dark:bg-emerald-950/20'}`}>
        <div className="grid grid-cols-4 gap-4 flex-1">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Date</span>
            <span className="text-sm font-medium">{format(new Date(txn.date), 'MMM dd, yyyy')}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Reference</span>
            <span className="text-sm font-mono">{txn.reference || '-'}</span>
          </div>
          <div className="flex flex-col col-span-2">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Type</span>
            <div className="flex items-center gap-2">
              {isPurchase ? (
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-none h-5">
                  Purchase Order
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-none h-5">
                  Unallocated Payment
                </Badge>
              )}
              <span className="text-xs text-muted-foreground italic truncate">{txn.description}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end min-w-[120px]">
          <span className="text-[10px] uppercase text-muted-foreground font-semibold">Total Amount</span>
          <span className={`text-sm font-bold ${isPurchase ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            ₱{fmt(txn.amount)}
          </span>
        </div>
      </div>

      {/* Purchase details + payments */}
      {isPurchase && (
        <div className="border-t">
          <div className="grid grid-cols-3 bg-muted/10 px-4 py-2 border-b">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-muted-foreground">Status</span>
              <Badge variant="outline" className={`w-fit h-5 text-[10px] ${STATUS_STYLES[txn.status ?? ''] ?? 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                {txn.status}
              </Badge>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-muted-foreground">Paid</span>
              <span className="text-sm font-medium text-emerald-600">₱{fmt(txn.paidAmount || 0)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase text-muted-foreground">Balance</span>
              <span className={`text-sm font-bold ${txn.balance && txn.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                ₱{fmt(txn.balance || 0)}
              </span>
            </div>
          </div>

          {txn.payments && txn.payments.length > 0 ? (
            <Table>
              <TableHeader className="bg-muted/5">
                <TableRow className="h-8">
                  <TableHead className="text-[10px] h-8">Date</TableHead>
                  <TableHead className="text-[10px] h-8">Method</TableHead>
                  <TableHead className="text-[10px] h-8">Reference</TableHead>
                  <TableHead className="text-right text-[10px] h-8">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txn.payments.map(pay => (
                  <TableRow key={pay.id} className="h-8">
                    <TableCell className="py-2 text-xs">{format(new Date(pay.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="py-2 text-xs">{pay.paymentMethod}</TableCell>
                    <TableCell className="py-2 text-xs font-mono text-muted-foreground">{pay.reference || '-'}</TableCell>
                    <TableCell className="py-2 text-right text-xs font-semibold text-emerald-600">
                      ₱{fmt(pay.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-4 text-center text-xs text-muted-foreground italic">
              No payments recorded for this order.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
