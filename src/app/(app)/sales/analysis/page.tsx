
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Line, LineChart, CartesianGrid, XAxis } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Sale } from '@/lib/types';
import { useMemo } from 'react';

const chartConfig = {
  sales: {
    label: 'Sales',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export default function SalesAnalysisPage() {
  const firestore = useFirestore();
  const salesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sales') : null),
    [firestore]
  );
  const { data: sales } = useCollection<Sale>(salesCollection);

  const salesByDay = useMemo(() => {
    if (!sales) return [];
    const salesByDayMap = sales.reduce((acc, sale) => {
      const date = new Date(sale.invoiceDate || sale.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      acc.set(date, (acc.get(date) || 0) + sale.total);
      return acc;
    }, new Map<string, number>());
    return Array.from(salesByDayMap.entries()).map(([date, sales]) => ({ date, sales })).slice(-30);
  }, [sales]);


  return (
    <div className="grid gap-6 auto-rows-max">
      <Card>
        <CardHeader>
          <CardTitle>Sales Analysis</CardTitle>
          <CardDescription>
            Track your sales performance over various timeframes.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Sales Over Time</CardTitle>
          <CardDescription>
            Revenue stream analysis by day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <LineChart
              accessibilityLayer
              data={salesByDay} // This would be dynamic based on selected timeframe
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 6)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Line
                dataKey="sales"
                type="natural"
                stroke="var(--color-sales)"
                strokeWidth={2}
                dot={true}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Add more cards for hourly, monthly, and yearly analysis here */}
      {/* Example for Monthly */}
       <Card>
        <CardHeader>
          <CardTitle>Monthly Sales Analysis</CardTitle>
          <CardDescription>
            (Placeholder for monthly sales chart)
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center bg-secondary/50 rounded-lg">
                <p className="text-muted-foreground">Monthly chart coming soon.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
