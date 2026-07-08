'use client';

type Props = {
  summary: { totalCount: number; totalAmount: number };
};

export function OrdersSummaryCards({ summary }: Props) {
  return (
    <div className="px-6 pb-4 non-printable">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/50 rounded-lg p-4 border">
          <p className="text-xs text-muted-foreground font-medium">Total Orders</p>
          <p className="text-2xl font-bold">{summary.totalCount.toLocaleString('en-PH')}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 border">
          <p className="text-xs text-muted-foreground font-medium">Total Amount</p>
          <p className="text-2xl font-bold text-primary">
            ₱{summary.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  );
}
