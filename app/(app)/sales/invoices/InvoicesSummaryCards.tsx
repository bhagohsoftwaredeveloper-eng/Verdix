'use client';

import { formatAmount } from './use-invoices-utils';

type Props = {
  total: number;
  amountPaid: number;
  balance: number;
  due: number;
  overDue: number;
};

export function InvoicesSummaryCards({ total, amountPaid, balance, due, overDue }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Total</p>
        <p className="text-lg font-bold">₱{formatAmount(total)}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Amount Paid</p>
        <p className="text-lg font-bold text-primary">₱{formatAmount(amountPaid)}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Balance</p>
        <p className="text-lg font-bold">₱{formatAmount(balance)}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Due</p>
        <p className="text-lg font-bold">₱{formatAmount(due)}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">OverDue</p>
        <p className="text-lg font-bold text-destructive">₱{formatAmount(overDue)}</p>
      </div>
    </div>
  );
}
