'use client';

import { useState } from 'react';
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
import { Line, LineChart, Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart, Cell, Legend } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import {
  CalendarIcon,
  Loader2,
  SlidersHorizontal,
  FileDown,
  X,
} from 'lucide-react';
import { TerminalSelector } from '@/components/TerminalSelector';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getApiUrl } from '@/lib/api-config';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';

type SalesData = {
  date: string;
  transactionCount: number;
  totalRevenue: number;
  totalDiscount: number;
  cost: number;
  profit: number;
};

type HourlyData = {
  hour: string;
  sales: number;
  count: number;
};

type CategoryData = {
  category: string;
  sales: number;
  fill: string;
};

const chartConfig = {
  sales: { label: 'Sales', color: 'hsl(var(--primary))' },
  count: { label: 'Transactions', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function SalesAnalysisPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [terminal, setTerminal] = useState<string>('all');
  const [interval, setInterval] = useState<string>('daily');
  const [paymentType, setPaymentType] = useState<string>('all');

  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
  const [tempTerminal, setTempTerminal] = useState<string>('all');
  const [tempInterval, setTempInterval] = useState<string>('daily');
  const [tempPaymentType, setTempPaymentType] = useState<string>('all');

  const { data: salesData = [], isLoading: isLoadingSales } = useQuery<SalesData[]>({
    queryKey: ['analysisSalesData', dateRange?.from?.toISOString(), dateRange?.to?.toISOString(), terminal, interval, paymentType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
      if (terminal && terminal !== 'all') params.append('terminalId', terminal);
      if (interval) params.append('interval', interval);
      if (paymentType && paymentType !== 'all') params.append('paymentType', paymentType);
      const res = await fetch(getApiUrl(`/sales/by-date?${params.toString()}`));
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result = await res.json();
      return result.success ? result.data : [];
    },
  });

  const { data: hourlyData = [], isLoading: isLoadingHourly } = useQuery<HourlyData[]>({
    queryKey: ['analysisHourlyData', dateRange?.from?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.from) params.append('date', format(dateRange.from, 'yyyy-MM-dd'));
      const res = await fetch(getApiUrl(`/sales/hourly?${params.toString()}`));
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result = await res.json();
      return result.success ? result.data : [];
    },
  });

  const { data: categoryData = [], isLoading: isLoadingCategory } = useQuery<CategoryData[]>({
    queryKey: ['analysisCategoryData'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('/sales/monthly-category'));
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result = await res.json();
      return result.success ? result.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const resetFilters = () => {
    setDateRange(undefined);
    setTerminal('all');
    setInterval('daily');
    setPaymentType('all');
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(val || 0);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (interval === 'monthly') return format(date, 'MMMM yyyy');
    if (interval === 'hourly') return format(date, 'PP p');
    return format(date, 'PP');
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Transactions', 'Revenue', 'Discount', 'Cost', 'Profit'];
    const csvRows = salesData.map(item => [
      formatDate(item.date) || '',
      item.transactionCount || 0,
      item.totalRevenue || 0,
      item.totalDiscount || 0,
      item.cost || 0,
      item.profit || 0,
    ]);
    const csvContent = [headers.join(','), ...csvRows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sales_analysis_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const printContent = `
      <html><head><title>Sales Analysis Report</title>
      <style>body{font-family:sans-serif;font-size:10px;}table{width:100%;border-collapse:collapse;margin-bottom:20px;}th,td{border:1px solid #ddd;padding:4px;text-align:left;}th{background-color:#f2f2f2;font-weight:bold;}.text-right{text-align:right;}h2{margin-bottom:10px;}p{margin:5px 0;}</style>
      </head><body>
      <h2>Sales Analysis Report</h2>
      <p>Generated: ${format(new Date(), 'PPpp')}</p>
      <p>Interval: ${interval.charAt(0).toUpperCase() + interval.slice(1)}</p>
      <table><thead><tr><th>Date</th><th class="text-right">Transactions</th><th class="text-right">Revenue</th><th class="text-right">Discount</th><th class="text-right">Cost</th><th class="text-right">Profit</th></tr></thead>
      <tbody>${salesData.map(item => `<tr><td>${formatDate(item.date) || ''}</td><td class="text-right">${item.transactionCount}</td><td class="text-right">${formatCurrency(item.totalRevenue)}</td><td class="text-right">${formatCurrency(item.totalDiscount)}</td><td class="text-right">${formatCurrency(item.cost)}</td><td class="text-right">${formatCurrency(item.profit)}</td></tr>`).join('')}
      </tbody></table></body></html>`;
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const hasActiveFilters = dateRange || terminal !== 'all' || interval !== 'daily' || paymentType !== 'all';

  const summaryTotals = salesData.reduce((acc, row) => ({
    transactions: acc.transactions + row.transactionCount,
    revenue: acc.revenue + row.totalRevenue,
    discount: acc.discount + row.totalDiscount,
    cost: acc.cost + row.cost,
    profit: acc.profit + row.profit,
  }), { transactions: 0, revenue: 0, discount: 0, cost: 0, profit: 0 });

  const avgTransactionValue = summaryTotals.transactions > 0 ? summaryTotals.revenue / summaryTotals.transactions : 0;

  return (
    <div className="grid gap-6 auto-rows-max">
      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sales Analysis</CardTitle>
              <CardDescription>Comprehensive sales performance analytics across multiple dimensions.</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
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

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-muted/20 p-2 rounded-md border">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <FileDown className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={exportToCSV}>Export to CSV</DropdownMenuItem>
              <DropdownMenuItem onSelect={exportToPDF}>Export to PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn('h-8 justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>{format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}</>
                  ) : (
                    format(dateRange.from, 'LLL dd, y')
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
                {hasActiveFilters && <Badge variant="secondary" className="ml-2 px-1 rounded-sm">!</Badge>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Time Interval ({interval})</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={interval} onValueChange={setInterval}>
                    <DropdownMenuRadioItem value="daily">Daily</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="hourly">Hourly</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="monthly">Monthly</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setFilterDialogOpen(true); }}>
                Advanced Filters...
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={resetFilters} className="text-destructive">Reset Filters</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
              <span className="sr-only">Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Over Time</CardTitle>
            <CardDescription>Revenue trends by {interval} interval.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSales ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <LineChart accessibilityLayer data={salesData.map(d => ({ date: formatDate(d.date), sales: d.totalRevenue }))} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => v.slice(0, 6)} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                  <Line dataKey="sales" type="natural" stroke="var(--color-sales)" strokeWidth={2} dot={true} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hourly Sales Analysis</CardTitle>
            <CardDescription>Sales distribution by hour of day.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingHourly ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart accessibilityLayer data={hourlyData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="hour" tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
                  <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Comparison</CardTitle>
            <CardDescription>Revenue and transaction trends.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSales ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart accessibilityLayer data={salesData.slice(0, 12).map(d => ({ date: formatDate(d.date), revenue: d.totalRevenue, transactions: d.transactionCount }))} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => v.slice(0, 6)} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
                  <Bar dataKey="revenue" fill="var(--color-sales)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
            <CardDescription>Current month category distribution.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingCategory ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />Loading...
              </div>
            ) : categoryData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <PieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie data={categoryData} dataKey="sales" nameKey="category" cx="50%" cy="50%" outerRadius={80} label>
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center bg-secondary/50 rounded-lg">
                <p className="text-muted-foreground">No category data available.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filters Dialog */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Filter Options</DialogTitle><DialogDescription className="sr-only">Filter sales analysis by date interval and terminal</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Interval</Label>
              <Select value={tempInterval} onValueChange={setTempInterval}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select interval" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Terminal</Label>
              <div className="col-span-3">
                <TerminalSelector terminalId={tempTerminal} onTerminalChange={setTempTerminal} showAllOption={true} />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Payment</Label>
              <Select value={tempPaymentType} onValueChange={setTempPaymentType}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select payment type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment Types</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="GCash">GCash</SelectItem>
                  <SelectItem value="Maya">Maya</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Account">Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFilterDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              setTerminal(tempTerminal);
              setInterval(tempInterval);
              setPaymentType(tempPaymentType);
              setFilterDialogOpen(false);
            }}>Apply Filters</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
