type SummaryTotals = {
  discount: number;
  revenue: number;
  vatable: number;
  vatAmount: number;
  vatExempt: number;
  zeroRated: number;
  nonVat: number;
  cost: number;
  profit: number;
};

type Props = {
  summaryTotals: SummaryTotals;
  formatCurrency: (val: number) => string;
};

export function ByDateSummaryCards({ summaryTotals, formatCurrency }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Discount</p>
        <p className="text-lg font-bold">{formatCurrency(summaryTotals.discount)}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Revenue</p>
        <p className="text-lg font-bold text-primary">{formatCurrency(summaryTotals.revenue)}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Amount Paid</p>
        <p className="text-lg font-bold">{formatCurrency(summaryTotals.revenue)}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Vatable</p>
        <p className="text-lg font-bold">{formatCurrency(summaryTotals.vatable)}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">VAT</p>
        <p className="text-lg font-bold">{formatCurrency(summaryTotals.vatAmount)}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Exempt</p>
        <p className="text-lg font-bold">{formatCurrency(summaryTotals.vatExempt)}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Zero</p>
        <p className="text-lg font-bold">{formatCurrency(summaryTotals.zeroRated)}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Non-VAT</p>
        <p className="text-lg font-bold">{formatCurrency(summaryTotals.nonVat)}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Cost</p>
        <p className="text-lg font-bold">{formatCurrency(summaryTotals.cost)}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Profit</p>
        <p className="text-lg font-bold text-green-600">{formatCurrency(summaryTotals.profit)}</p>
      </div>
    </div>
  );
}
