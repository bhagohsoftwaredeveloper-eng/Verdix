
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
import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart, Line, LineChart } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Sale } from '@/lib/types';
import { useMemo } from 'react';

const salesChartConfig = {
  sales: {
    label: 'Sales',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

const topProductsChartConfig = {
  sales: {
    label: 'Sales',
    color: 'hsl(var(--accent))',
  },
} satisfies ChartConfig;

const categoryChartConfig = {
  value: {
    label: 'Sales',
  },
  electronics: {
    label: 'Electronics',
    color: 'hsl(var(--chart-1))',
  },
  audio: {
    label: 'Audio',
    color: 'hsl(var(--chart-2))',
  },
  computers: {
    label: 'Computers',
    color: 'hsl(var(--chart-3))',
  },
  gaming: {
    label: 'Gaming',
    color: 'hsl(var(--chart-4))',
  },
  storage: {
    label: 'Storage',
    color: 'hsl(var(--chart-5))',
  },
} satisfies ChartConfig;


export default function ReportsPage() {
  const firestore = useFirestore();
  const salesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sales') : null),
    [firestore]
  );
  const { data: sales } = useCollection<Sale>(salesCollection);

  const { salesByDay, topProducts, salesByCategory } = useMemo(() => {
    if (!sales) {
        return { salesByDay: [], topProducts: [], salesByCategory: [] };
    }
    
    const salesByDayMap = sales.reduce((acc, sale) => {
        const date = new Date(sale.invoiceDate || sale.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        acc.set(date, (acc.get(date) || 0) + sale.total);
        return acc;
    }, new Map<string, number>());
    const salesByDay = Array.from(salesByDayMap.entries()).map(([date, sales]) => ({ date, sales })).slice(-7);

    const productSalesMap = sales.reduce((acc, sale) => {
        sale.items.forEach(item => {
            acc.set(item.product.name, (acc.get(item.product.name) || 0) + item.price * item.quantity);
        });
        return acc;
    }, new Map<string, number>());
    const topProducts = Array.from(productSalesMap.entries()).map(([name, sales]) => ({ name, sales })).sort((a,b) => b.sales - a.sales).slice(0, 5);


    const categorySalesMap = sales.reduce((acc, sale) => {
        sale.items.forEach(item => {
            const category = item.product.category || 'Uncategorized';
             acc.set(category, (acc.get(category) || 0) + item.price * item.quantity);
        });
        return acc;
    }, new Map<string, number>());
    const salesByCategory = Array.from(categorySalesMap.entries()).map(([name, value]) => ({ name, value, fill: `hsl(var(--chart-${Object.keys(categoryChartConfig).indexOf(name.toLowerCase()) + 1}))` }));

    return { salesByDay, topProducts, salesByCategory };
  }, [sales]);


  return (
    <div className="grid gap-6 auto-rows-max">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Over Time</CardTitle>
            <CardDescription>Track your revenue stream daily.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={salesChartConfig} className="h-[250px] w-full">
              <LineChart accessibilityLayer data={salesByDay} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
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
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>Your best performers this month.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={topProductsChartConfig} className="h-[250px] w-full">
              <BarChart accessibilityLayer data={topProducts} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" hide />
                <XAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  hide
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="sales" layout="vertical" fill="var(--color-sales)" radius={5} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Sales by Category</CardTitle>
          <CardDescription>Breakdown of sales across different product categories.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <ChartContainer config={categoryChartConfig} className="h-[350px] w-full max-w-lg">
            <PieChart accessibilityLayer>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={salesByCategory}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                strokeWidth={5}
              />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
