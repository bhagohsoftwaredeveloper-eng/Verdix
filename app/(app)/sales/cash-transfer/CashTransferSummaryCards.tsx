import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  totalCashIn: number;
  totalCashOut: number;
  formatCurrency: (val: number) => string;
};

export function CashTransferSummaryCards({ totalCashIn, totalCashOut, formatCurrency }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Cash In</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            +{formatCurrency(totalCashIn)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Cash Out</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            -{formatCurrency(totalCashOut)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
