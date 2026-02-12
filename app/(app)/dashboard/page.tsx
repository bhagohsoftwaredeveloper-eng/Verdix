'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { CartesianGrid, XAxis, Line, LineChart } from 'recharts';
import { Package, ShoppingCart, AlertCircle, Boxes, TrendingUp, Loader2 } from 'lucide-react';
import type { ChartConfig } from '@/components/ui/chart';
import { SupplierScheduleCard } from './supplier-schedule-card';
import { HourlySalesChart } from './hourly-sales-chart';
import { TopSellingProductsChart } from './top-selling-products-chart';
import { SalesByCategoryChart } from './sales-by-category-chart';

const salesChartConfig = {
  sales: {
    label: 'Sales',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

// Removed topProductsChartConfig and categoryChartConfig as they are now handled in components

function CurrencyIcon({ className }: { className?: string }) {
    return (
        <span className={`font-bold ${className}`} style={{ fontSize: '1em', lineHeight: 1 }}>
            ₱
        </span>
    )
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/reports/stats');
        const result = await res.json();
        
        // Data processing for charts is now handled within the components
        
        setData(result);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
      return (
          <div className="flex items-center justify-center h-screen">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      );
  }

  const { salesByDay, topProducts, salesByCategory, summary } = data || {};

  return (
    <div className="flex flex-col gap-6 animate-fade-in p-1">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your business performance.</p>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border">
                Last updated: {new Date().toLocaleTimeString()}
            </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="glass-card overflow-hidden relative group hover:shadow-md transition-all duration-300 border-primary/10">
          <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <div className="p-2 bg-primary/10 rounded-full text-primary">
                <CurrencyIcon className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{(summary?.totalRevenueAllTime || 0).toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-green-600 mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>+₱{(summary?.totalRevenueMonth || 0).toLocaleString()} this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden relative group hover:shadow-md transition-all duration-300 border-blue-500/10">
           <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sales</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-full text-blue-500">
             <ShoppingCart className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{summary?.totalSalesMonth || 0}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>Transactions this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden relative group hover:shadow-md transition-all duration-300 border-purple-500/10">
           <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Products Sold</CardTitle>
            <div className="p-2 bg-purple-500/10 rounded-full text-purple-500">
                <Package className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{summary?.productsSoldMonth || 0}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>Items sold this month</span>
            </div>
          </CardContent>
        </Card>

         <Card className="glass-card overflow-hidden relative group hover:shadow-md transition-all duration-300 border-indigo-500/10">
           <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
            <div className="p-2 bg-indigo-500/10 rounded-full text-indigo-500">
                <Boxes className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalItems || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique products in inventory</p>
          </CardContent>
        </Card>

        <Link href="/reports/low-stock" className="block h-full">
          <Card className="h-full glass-card overflow-hidden relative group hover:shadow-md transition-all duration-300 border-destructive/20 bg-destructive/5 hover:bg-destructive/10 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-destructive">Low Stock</CardTitle>
               <div className="p-2 bg-destructive/10 rounded-full text-destructive group-hover:scale-110 transition-transform">
                <AlertCircle className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{summary?.lowStockItems || 0}</div>
              <p className="text-xs text-destructive/80 mt-1 font-medium">Items Need Attention</p>
            </CardContent>
          </Card>
        </Link>
      </div>
      
      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
         <div className="col-span-1 lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>Sales Over Time</CardTitle>
                <CardDescription>Daily revenue (Last 30 Days).</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={salesChartConfig} className="h-[300px] w-full">
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
         </div>
         <div className="col-span-1 lg:col-span-3">
             <TopSellingProductsChart data={topProducts} />
         </div>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <HourlySalesChart />
            <div className="col-span-1 lg:col-span-3">
                <SalesByCategoryChart data={salesByCategory} />
            </div>
       </div>

       <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
             <SupplierScheduleCard />
       </div>

    </div>
  );
}
