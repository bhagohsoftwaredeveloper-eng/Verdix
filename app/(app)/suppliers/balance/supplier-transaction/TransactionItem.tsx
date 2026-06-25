'use client';

import { differenceInDays, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SupplierTransaction } from '../../actions';

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });

const STATUS_STYLES: Record<string, string> = {
  'Paid':           'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Partially Paid': 'bg-blue-50 text-blue-700 border-blue-200',
};

function OverdueBadge({ dueDate }: { dueDate: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const days = differenceInDays(today, due);

  if (days < 0) {
    return (
      <Badge variant="outline" className="h-4 text-[9px] px-1 border-emerald-300 text-emerald-700 bg-emerald-50">
        Due in {Math.abs(days)}d
      </Badge>
    );
  }
  if (days === 0) {
    return (
      <Badge variant="outline" className="h-4 text-[9px] px-1 border-yellow-300 text-yellow-700 bg-yellow-50">
        Due today
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={`h-4 text-[9px] px-1 ${
      days <= 30 ? 'border-yellow-300 text-yellow-700 bg-yellow-50' :
      days <= 60 ? 'border-orange-300 text-orange-700 bg-orange-50' :
                  'border-red-400 text-red-700 bg-red-50'
    }`}>
      {days}d overdue
    </Badge>
  );
}

const TYPE_CONFIG = {
  PURCHASE:    { label: 'Purchase Order',      bg: 'bg-muted/30',                          badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',   amountColor: 'text-red-600 dark:text-red-400'     },
  PAYMENT:     { label: 'Unallocated Payment', bg: 'bg-emerald-50 dark:bg-emerald-950/20', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', amountColor: 'text-emerald-600 dark:text-emerald-400' },
  CREDIT_MEMO: { label: 'Credit Memo',         bg: 'bg-purple-50 dark:bg-purple-950/20',  badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',   amountColor: 'text-purple-600 dark:text-purple-400'  },
};

export function TransactionItem({ txn }: { txn: SupplierTransaction }) {
  const isPurchase = txn.type === 'PURCHASE';
  const cfg = TYPE_CONFIG[txn.type];

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
      {/* Header row */}
      <div className={`flex items-center justify-between p-4 ${cfg.bg}`}>
        <div className="grid grid-cols-4 gap-4 flex-1">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Date</span>
            <span className="text-sm font-medium">{format(new Date(txn.date), 'MMM dd, yyyy')}</span>
            {isPurchase && txn.dueDate && (
              <span className="text-[10px] text-muted-foreground">
                Due {format(new Date(txn.dueDate + 'T00:00:00'), 'MMM dd, yyyy')}
              </span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Reference</span>
            <span className="text-sm font-mono">{txn.reference || '-'}</span>
          </div>
          <div className="flex flex-col col-span-2">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Type</span>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className={`${cfg.badge} border-none h-5`}>
                {cfg.label}
              </Badge>
              {isPurchase && txn.dueDate && txn.balance && txn.balance > 0 && (
                <OverdueBadge dueDate={txn.dueDate} />
              )}
              <span className="text-xs text-muted-foreground italic truncate">{txn.description}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1 items-end min-w-[160px]">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Total Amount</span>
            <span className={`text-sm font-bold ${cfg.amountColor}`}>
              ₱{fmt(txn.amount)}
            </span>
          </div>
          {txn.runningBalance !== undefined && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase text-muted-foreground font-semibold">AP Balance</span>
              <span className={`text-xs font-semibold ${txn.runningBalance > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                ₱{fmt(txn.runningBalance)}
              </span>
            </div>
          )}
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
