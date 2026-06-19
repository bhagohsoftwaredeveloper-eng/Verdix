type SummaryTotals = {
  totalRevenue: number;
  totalDiscount: number;
  totalCost: number;
  totalProfit: number;
  unitsSold: number;
};

type Props = {
  summaryTotals: SummaryTotals;
};

const fmt = (val: number) =>
  val.toLocaleString('en-PH', { minimumFractionDigits: 2 });

export function ByProductSummaryCards({ summaryTotals }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
        <p className="text-lg font-bold text-primary">₱{fmt(summaryTotals.totalRevenue)}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Total Discount</p>
        <p className="text-lg font-bold text-red-500">₱{fmt(summaryTotals.totalDiscount)}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Total Cost</p>
        <p className="text-lg font-bold">₱{fmt(summaryTotals.totalCost)}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Total Profit</p>
        <p className="text-lg font-bold text-green-600">₱{fmt(summaryTotals.totalProfit)}</p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 border">
        <p className="text-xs text-muted-foreground font-medium">Total Units Sold</p>
        <p className="text-lg font-bold">{summaryTotals.unitsSold.toLocaleString()}</p>
      </div>
    </div>
  );
}
