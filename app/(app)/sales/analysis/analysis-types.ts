import type { ChartConfig } from '@/components/ui/chart';

export type SalesData = {
  date: string;
  transactionCount: number;
  totalRevenue: number;
  totalDiscount: number;
  cost: number;
  profit: number;
};

export type HourlyData = {
  hour: string;
  sales: number;
  count: number;
};

export type CategoryData = {
  category: string;
  sales: number;
  fill: string;
};

export const chartConfig = {
  sales: { label: 'Sales', color: 'hsl(var(--primary))' },
  count: { label: 'Transactions', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;

export const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];
