'use client';

import { useState, useEffect, Fragment } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { 
  Search, 
  X, 
  Loader2, 
  SlidersHorizontal, 
  Download, 
  FileText, 
  FileSpreadsheet, 
  ChevronDown, 
  ChevronUp, 
  CalendarIcon 
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
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type SalesData = {
  date: string;
  transactionCount: number;
  startOR: string;
  endOR: string;
  totalRevenue: number;
  totalDiscount: number;
  vatableSales: number;
  vatAmount: number;
  vatExemptSales: number;
  zeroRatedSales: number;
  nonVatSales: number;
  cost: number;
  profit: number;
};

export default function SalesByDatePage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [terminal, setTerminal] = useState<string>('all');
  const [interval, setInterval] = useState<string>('daily');
  const [paymentType, setPaymentType] = useState<string>('all');
  const [transactionReference, setTransactionReference] = useState<string>(''); // For filtering specific reference if needed
  
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Dialog State
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
  const [tempTerminal, setTempTerminal] = useState<string>('all');
  const [tempInterval, setTempInterval] = useState<string>('daily');
  const [tempPaymentType, setTempPaymentType] = useState<string>('all');

  const [searchTerm, setSearchTerm] = useState('');

  const fetchSalesByDate = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange?.from) {
        params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange?.to) {
        params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
      }
      if (terminal && terminal !== 'all') {
        params.append('terminalId', terminal);
      }
      if (interval) {
        params.append('interval', interval);
      }
      if (paymentType && paymentType !== 'all') {
        params.append('paymentType', paymentType);
      }

      const response = await fetch(`/api/sales/by-date?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setSalesData(result.data);
      } else {
        console.error('Failed to fetch sales by date:', result.error);
        setSalesData([]);
      }
    } catch (error) {
      console.error('Error fetching sales by date:', error);
      setSalesData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesByDate();
  }, [dateRange, terminal, interval, paymentType]);

  const toggleRowExpansion = (date: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const resetFilters = () => {
    setDateRange(undefined);
    setTerminal('all');
    setInterval('daily');
    setPaymentType('all');
    setTransactionReference('');
    setSearchTerm('');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (interval === 'monthly') return format(date, 'MMMM yyyy');
    if (interval === 'hourly') return format(date, 'PP p');
    return format(date, 'PP');
  };

  const hasActiveFilters = dateRange || terminal !== 'all' || interval !== 'daily' || paymentType !== 'all' || searchTerm;

  // Calculate Summary Totals
  const summaryTotals = salesData.reduce((acc, row) => ({
    discount: acc.discount + row.totalDiscount,
    revenue: acc.revenue + row.totalRevenue,
    vatable: acc.vatable + row.vatableSales,
    vatAmount: acc.vatAmount + row.vatAmount,
    vatExempt: acc.vatExempt + row.vatExemptSales,
    zeroRated: acc.zeroRated + row.zeroRatedSales,
    nonVat: acc.nonVat + row.nonVatSales,
    cost: acc.cost + row.cost,
    profit: acc.profit + row.profit
  }), {
    discount: 0, revenue: 0, vatable: 0, vatAmount: 0, vatExempt: 0, zeroRated: 0, nonVat: 0, cost: 0, profit: 0
  });

  // Filter Sales Data
  const filteredSalesData = salesData.filter(row => {
     if (!searchTerm) return true;
     const term = searchTerm.toLowerCase();
     const dateStr = formatDate(row.date).toLowerCase();
     const orStart = (row.startOR || '').toLowerCase();
     const orEnd = (row.endOR || '').toLowerCase();
     
     return dateStr.includes(term) || orStart.includes(term) || orEnd.includes(term);
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sales By Date</CardTitle>
              <CardDescription>
                Comprehensive sales report aggregated by {interval}.
              </CardDescription>
            </div>
          </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
         {/* 1. Summary Cards (Top) */}
         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-muted/50 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground font-medium">Discount</p>
              <p className="text-lg font-bold">{formatCurrency(summaryTotals.discount)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground font-medium">Revenue</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(summaryTotals.revenue)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground font-medium">Amount Paid</p>
              {/* Note: Amount Paid wasn't originally in SalesByDate logic but is in SalesDetails. 
                  SalesByDate had separate Revenue. Assuming Revenue = Amount Paid for now or just stick to existing fields but styled.
                  Sticking to existing fields but styled. */} 
               <p className="text-lg font-bold">{formatCurrency(summaryTotals.revenue)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground font-medium">Vatable</p>
              <p className="text-lg font-bold">{formatCurrency(summaryTotals.vatable)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground font-medium">VAT</p>
              <p className="text-lg font-bold">{formatCurrency(summaryTotals.vatAmount)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground font-medium">Exempt</p>
              <p className="text-lg font-bold">{formatCurrency(summaryTotals.vatExempt)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground font-medium">Zero</p>
              <p className="text-lg font-bold">{formatCurrency(summaryTotals.zeroRated)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground font-medium">Non-VAT</p>
              <p className="text-lg font-bold">{formatCurrency(summaryTotals.nonVat)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground font-medium">Cost</p>
              <p className="text-lg font-bold">{formatCurrency(summaryTotals.cost)}</p>
            </div>
             <div className="bg-muted/50 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground font-medium">Profit</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(summaryTotals.profit)}</p>
            </div>
         </div>

         {/* 2. Filter Bar (Middle) */}
         <div className="flex items-center justify-between gap-4 flex-wrap bg-muted/20 p-2 rounded-md border">
            {/* Search Input */}
             <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="pl-8 w-full h-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>

             <div className="flex items-center gap-2">
                {/* Date Range Popover */}
                 <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} size="sm" className={cn("h-8 justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>

                {/* Filter Dropdown */}
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
                    <DropdownMenuItem onSelect={resetFilters} className="text-destructive">
                      Reset Filters
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Reset Button (only if active filters) */}
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 w-8 p-0">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Reset</span>
                    </Button>
                )}
             </div>
         </div>

         {/* 3. Data Table (Bottom) */}
         <div className="flex-1 overflow-auto border rounded-md">
            <div className="relative w-full">
                <Table className="text-xs whitespace-nowrap w-full">
                  <TableHeader className="sticky top-0 z-10 bg-primary hover:bg-primary shadow-sm">
                    <TableRow className="bg-primary hover:bg-primary border-none">
                      <TableHead className="w-8 text-primary-foreground"></TableHead>
                      <TableHead className="text-primary-foreground font-semibold h-9 py-2">Date</TableHead>
                      <TableHead className="text-primary-foreground font-semibold h-9 py-2">Terminal</TableHead>
                      <TableHead className="text-primary-foreground font-semibold h-9 py-2">OR Range</TableHead>
                      <TableHead className="text-primary-foreground font-semibold h-9 py-2 text-right">Discount</TableHead>
                      <TableHead className="text-primary-foreground font-semibold h-9 py-2 text-right">Revenue</TableHead>
                      <TableHead className="text-primary-foreground font-semibold h-9 py-2 text-right">Vatable</TableHead>
                      <TableHead className="text-primary-foreground font-semibold h-9 py-2 text-right">VAT</TableHead>
                      <TableHead className="text-primary-foreground font-semibold h-9 py-2 text-right">Exempt</TableHead>
                      <TableHead className="text-primary-foreground font-semibold h-9 py-2 text-right">Zero</TableHead>
                      <TableHead className="text-primary-foreground font-semibold h-9 py-2 text-right">Non-VAT</TableHead>
                      <TableHead className="text-primary-foreground font-semibold h-9 py-2 text-right">Cost</TableHead>
                      <TableHead className="text-primary-foreground font-semibold h-9 py-2 text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                         <TableCell colSpan={13} className="h-24 text-center">
                            <div className="flex justify-center items-center">
                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                Loading data...
                            </div>
                         </TableCell>
                      </TableRow>
                    ) : filteredSalesData.length > 0 ? (
                      filteredSalesData.map((row, index) => {
                        const isExpanded = expandedRows.has(row.date);
                        return (
                          <Fragment key={row.date}>
                            <TableRow 
                                className={`cursor-pointer hover:bg-muted/50 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                                onClick={() => toggleRowExpansion(row.date)}
                            >
                                <TableCell className="py-2 px-2 w-8 text-center">
                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                </TableCell>
                                <TableCell className="py-2 px-2 font-medium">{formatDate(row.date)}</TableCell>
                                <TableCell className="py-2 px-2">{terminal === 'all' ? 'All' : terminal}</TableCell>
                                <TableCell className="py-2 px-2 text-xs text-muted-foreground">
                                    {row.startOR && row.endOR ? (
                                        <div className="flex flex-col">
                                            <span>{row.startOR}</span>
                                            <span>{row.endOR}</span>
                                        </div>
                                    ) : '-'}
                                </TableCell>
                                <TableCell className="py-2 px-2 text-right">{formatCurrency(row.totalDiscount)}</TableCell>
                                <TableCell className="py-2 px-2 text-right font-bold">{formatCurrency(row.totalRevenue)}</TableCell>
                                <TableCell className="py-2 px-2 text-right">{formatCurrency(row.vatableSales)}</TableCell>
                                <TableCell className="py-2 px-2 text-right">{formatCurrency(row.vatAmount)}</TableCell>
                                <TableCell className="py-2 px-2 text-right">{formatCurrency(row.vatExemptSales)}</TableCell>
                                <TableCell className="py-2 px-2 text-right">{formatCurrency(row.zeroRatedSales)}</TableCell>
                                <TableCell className="py-2 px-2 text-right">{formatCurrency(row.nonVatSales)}</TableCell>
                                <TableCell className="py-2 px-2 text-right">{formatCurrency(row.cost)}</TableCell>
                                <TableCell className="py-2 px-2 text-right font-bold text-green-600">{formatCurrency(row.profit)}</TableCell>
                            </TableRow>
                            {isExpanded && (
                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableCell colSpan={13} className="p-4">
                                        <div className="flex items-center justify-center h-20 text-muted-foreground bg-background/50 rounded border border-dashed">
                                           <span>Detailed transactions for {formatDate(row.date)} will be displayed here.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                          </Fragment>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={13} className="h-24 text-center">
                            No sales data found for the selected criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
            </div>
         </div>
      </CardContent>

      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Filter Options</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Interval</Label>
                <Select value={tempInterval} onValueChange={setTempInterval}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
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
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
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
             <div className="grid grid-cols-4 items-center gap-4">
                 <Label className="text-right">Reference</Label>
                 <Input 
                    placeholder="Transaction Reference" 
                    className="col-span-3" 
                    value={transactionReference}
                    onChange={(e) => setTransactionReference(e.target.value)}
                 />
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
    </Card>
  );
}
