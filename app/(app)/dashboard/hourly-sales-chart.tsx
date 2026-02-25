'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Loader2 } from 'lucide-react';
import { getApiUrl } from '@/lib/api-config';

const chartConfig = {
  sales: {
    label: 'Sales',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

type HourlyData = {
  hour: string;
  sales: number;
  count: number;
};

export function HourlySalesChart() {
  const [data, setData] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(getApiUrl('/sales/hourly'));
        if (!res.ok) {
          throw new Error('Failed to fetch hourly sales');
        }
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.error || 'Failed to load data');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (error) {
    return (
      <Card className="col-span-4 glass-card border-none shadow-sm h-[400px] flex items-center justify-center text-red-500">
        Error: {error}
      </Card>
    );
  }

  return (
    <Card className="col-span-4 glass-card border-none shadow-sm">
      <CardHeader>
        <CardTitle>Hourly Sales</CardTitle>
        <CardDescription>
          Sales distribution by hour for today.
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <BarChart accessibilityLayer data={data}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="hour"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value}
                className="text-muted-foreground text-xs"
              />
              <ChartTooltip
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                content={<ChartTooltipContent indicator="dot" className="bg-background/90 backdrop-blur border-border/50" />}
              />
              <Bar
                dataKey="sales"
                fill="url(#colorSales)"
                radius={[4, 4, 0, 0]}
                className="hover:opacity-90 transition-opacity"
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
