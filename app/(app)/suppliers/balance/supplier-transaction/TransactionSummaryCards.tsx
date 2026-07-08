'use client';

import { Receipt, CreditCard, Wallet } from 'lucide-react';

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });

type Props = {
  totalPurchases: number;
  totalPaid: number;
  currentBalance: number;
};

export function TransactionSummaryCards({ totalPurchases, totalPaid, currentBalance }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'Total Purchases', value: totalPurchases, icon: Receipt,    bg: 'bg-orange-100 dark:bg-orange-900/30',   color: 'text-orange-600',  textColor: '' },
        { label: 'Total Paid',      value: totalPaid,      icon: CreditCard, bg: 'bg-emerald-100 dark:bg-emerald-900/30', color: 'text-emerald-600', textColor: '' },
        { label: 'Current Balance', value: currentBalance, icon: Wallet,     bg: 'bg-red-100 dark:bg-red-900/30',         color: 'text-red-600',     textColor: 'text-red-600' },
      ].map(({ label, value, icon: Icon, bg, color, textColor }) => (
        <div key={label} className="bg-muted/30 border rounded-lg p-3 flex items-center gap-3">
          <div className={`${bg} p-2 rounded-full`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-semibold">{label}</p>
            <p className={`text-sm font-bold ${textColor}`}>₱{fmt(value)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
