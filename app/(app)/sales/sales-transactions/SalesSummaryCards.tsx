'use client';

import type { SalesTotals } from './sales-types';

const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

interface Props {
  totals: SalesTotals;
}

export function SalesSummaryCards({ totals }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
      <div className="bg-muted/50 rounded-lg p-3 border"><p className="text-xs text-muted-foreground font-medium">Discounts</p><p className="text-lg font-bold">{fmt(totals.discounts)}</p></div>
      <div className="bg-muted/50 rounded-lg p-3 border"><p className="text-xs text-muted-foreground font-medium">Revenue</p><p className="text-lg font-bold text-primary">{fmt(totals.revenue)}</p></div>
      <div className="bg-muted/50 rounded-lg p-3 border"><p className="text-xs text-muted-foreground font-medium">Amount Paid</p><p className="text-lg font-bold">{fmt(totals.amountPaid)}</p></div>
      <div className="bg-muted/50 rounded-lg p-3 border"><p className="text-xs text-muted-foreground font-medium">Customer Balance</p><p className="text-lg font-bold">{fmt(totals.customerBalance)}</p></div>
      <div className="bg-muted/50 rounded-lg p-3 border"><p className="text-xs text-muted-foreground font-medium">Cost</p><p className="text-lg font-bold">{fmt(totals.cost)}</p></div>
      <div className="bg-muted/50 rounded-lg p-3 border"><p className="text-xs text-muted-foreground font-medium">Gross Profit</p><p className="text-lg font-bold text-green-600">{fmt(totals.grossProfit)}</p></div>
      <div className="bg-muted/50 rounded-lg p-3 border"><p className="text-xs text-muted-foreground font-medium">Vatable Sales</p><p className="text-lg font-bold">{fmt(totals.vatableSales)}</p></div>
      <div className="bg-muted/50 rounded-lg p-3 border"><p className="text-xs text-muted-foreground font-medium">VAT Amount</p><p className="text-lg font-bold">{fmt(totals.vatAmount)}</p></div>
      <div className="bg-muted/50 rounded-lg p-3 border"><p className="text-xs text-muted-foreground font-medium">Non-Vat Sales</p><p className="text-lg font-bold">{fmt(totals.nonVatSales)}</p></div>
      <div className="bg-muted/50 rounded-lg p-3 border"><p className="text-xs text-muted-foreground font-medium">Account Payments</p><p className="text-lg font-bold">{fmt(totals.accountPayments)}</p></div>
    </div>
  );
}
