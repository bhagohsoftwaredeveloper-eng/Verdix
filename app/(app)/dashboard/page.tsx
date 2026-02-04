'use client';

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
import { Bar, BarChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, ShoppingCart, AlertCircle, Boxes, TrendingUp, DollarSign } from 'lucide-react';
import type { ChartConfig } from '@/components/ui/chart';
import { Product, Sale } from '@/lib/types';
import { mockProducts, mockSales } from '@/lib/data';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { SupplierScheduleCard } from './supplier-schedule-card';
import { HourlySalesChart } from './hourly-sales-chart';
import { TopSellingProductsChart } from './top-selling-products-chart';
import { MonthlySalesPieChart } from './monthly-sales-pie-chart';

const chartConfig = {
  sales: {
    label: 'Sales',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

function CurrencyIcon({ className }: { className?: string }) {
    return <DollarSign className={className} />
}

export default function DashboardPage() {
  const products = mockProducts;
  const sales = mockSales;

  const { totalRevenue, totalSales, productsSold, lowStockItems, totalItems, salesByDay } = useMemo(() => {
    if (!sales || !products) {
      return { totalRevenue: 0, totalSales: 0, productsSold: 0, lowStockItems: 0, totalItems: 0, salesByDay: [] };
    }

    const totalRevenue = sales.reduce((acc: number, sale: Sale) => acc + sale.total, 0);
    const totalSales = sales.length;
    const productsSold = sales.reduce((acc: number, sale: Sale) => acc + (sale.items?.length || 0), 0);
    const lowStockItems = products.filter((p: Product) => p.stock < p.reorderPoint).length;
    const totalItems = products.length;


    const salesByDayMap = sales.reduce((acc: Map<string, number>, sale: Sale) => {
        const date = new Date(sale.invoiceDate || sale.date || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        acc.set(date, (acc.get(date) || 0) + sale.total);
        return acc;
    }, new Map<string, number>());

    const salesByDay = Array.from(salesByDayMap.entries()).map(([date, sales]) => ({ date, sales })).slice(-7);


    return { totalRevenue, totalSales, productsSold, lowStockItems, totalItems, salesByDay };
  }, [sales, products]);


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
              ₱{totalRevenue.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-green-600 mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>+20.1% from last month</span>
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
            <div className="text-2xl font-bold">+{totalSales}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>+180.1% from last month</span>
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
            <div className="text-2xl font-bold">+{productsSold}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>+19% from last month</span>
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
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique products in inventory</p>
          </CardContent>
        </Card>

        <Link href="/inventory?filter=low-stock" className="block h-full">
          <Card className="h-full glass-card overflow-hidden relative group hover:shadow-md transition-all duration-300 border-destructive/20 bg-destructive/5 hover:bg-destructive/10 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-destructive">Low Stock</CardTitle>
               <div className="p-2 bg-destructive/10 rounded-full text-destructive group-hover:scale-110 transition-transform">
                <AlertCircle className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{lowStockItems}</div>
              <p className="text-xs text-destructive/80 mt-1 font-medium">Items Need Attention</p>
            </CardContent>
          </Card>
        </Link>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
         <div className="col-span-1 lg:col-span-7">
            <HourlySalesChart />
         </div>
         <div className="col-span-1 lg:col-span-4">
             <TopSellingProductsChart />
         </div>
         <div className="col-span-1 lg:col-span-3">
             <MonthlySalesPieChart />
         </div>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
         <SupplierScheduleCard />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 glass-card border-none shadow-sm">
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
            <CardDescription>
              A summary of sales over the last 7 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart accessibilityLayer data={salesByDay}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 6)}
                  className="text-muted-foreground text-xs"
                />
                 <ChartTooltip
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                  content={<ChartTooltipContent indicator="dot" className="bg-background/90 backdrop-blur border-border/50" />}
                />
                <Bar 
                    dataKey="sales" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    className="hover:opacity-90 transition-opacity"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 glass-card border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                     <CardTitle>Recent Sales</CardTitle>
                    <CardDescription>
                    You made {sales?.length || 0} sales this month.
                    </CardDescription>
                </div>
                <Link href="/sales" className="text-sm text-primary hover:underline">View All</Link>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales?.slice(0, 6).map((sale) => (
                  <TableRow key={sale.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="font-medium text-foreground">{sale.customer.name || 'Walk-in Customer'}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(sale.date || Date.now()).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₱{sale.total.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                {(!sales || sales.length === 0) && (
                    <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                            No recent sales found.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
