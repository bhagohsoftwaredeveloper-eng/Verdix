type SummaryTotals = {
  transactions: number;
  revenue: number;
  discount: number;
  cost: number;
  profit: number;
};

type Props = {
  summaryTotals: SummaryTotals;
  avgTransactionValue: number;
  formatCurrency: (val: number) => string;
};

export function AnalysisSummaryCards({ summaryTotals, avgTransactionValue, formatCurrency }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
        <p className="text-lg font-bold text-primary">{formatCurrency(summaryTotals.revenue)}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Total Transactions</p>
        <p className="text-lg font-bold">{summaryTotals.transactions.toLocaleString()}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Avg Transaction</p>
        <p className="text-lg font-bold">{formatCurrency(avgTransactionValue)}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Total Profit</p>
        <p className="text-lg font-bold text-green-600">{formatCurrency(summaryTotals.profit)}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Total Cost</p>
        <p className="text-lg font-bold">{formatCurrency(summaryTotals.cost)}</p>
      </div>
    </div>
  );
}
