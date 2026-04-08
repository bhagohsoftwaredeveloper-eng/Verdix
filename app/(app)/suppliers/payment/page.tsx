'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Filter, X, CalendarIcon, FileDown, Loader2 } from 'lucide-react';
import { getSupplierPayments } from '../actions';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { cn, formatCurrency } from '@/lib/utils';
import { DateRange } from "react-day-picker";

export default function SupplierPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState('All');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    pageSize: 10,
    totalItems: 0
  });

  const loadPayments = async () => {
    setLoading(true);
    try {
      const response = await getSupplierPayments({
        searchTerm,
        page: pagination.currentPage,
        limit: pagination.pageSize,
        from: dateRange?.from?.toISOString(),
        to: dateRange?.to?.toISOString(),
        paymentMethod
      });
      
      if (response.success) {
        setPayments(response.data);
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            totalPages: response.pagination.totalPages,
            totalItems: response.pagination.total
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadPayments, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, dateRange, paymentMethod, pagination.currentPage, pagination.pageSize]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
       <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Payment Suppliers</h2>
      </div>

       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm mb-6">
          <div className="flex flex-1 items-center gap-2 w-full">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by supplier or reference..."
                className="pl-8 text-sm h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="relative h-9">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                  {(dateRange?.from || dateRange?.to || (paymentMethod !== 'All')) && (
                    <Badge 
                      variant="default" 
                      className="ml-2 h-4 min-w-4 rounded-full p-0 px-1 flex items-center justify-center bg-primary text-primary-foreground text-[10px]"
                    >
                      {(dateRange?.from || dateRange?.to ? 1 : 0) + (paymentMethod !== 'All' ? 1 : 0)}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="start">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2 mb-2">
                    <h4 className="font-semibold text-sm">Filters</h4>
                    {(dateRange?.from || dateRange?.to || paymentMethod !== 'All') && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setDateRange(undefined);
                          setPaymentMethod('All');
                        }}
                        className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="mr-1 h-3 w-3" />
                        Clear all
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-4">
                    <div className="grid gap-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Date Range</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="date"
                            variant={"outline"}
                            size="sm"
                            className={cn(
                              "w-full justify-start text-left font-normal h-9",
                              !dateRange && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                              dateRange.to ? (
                                <>
                                  {format(dateRange.from, "LLL dd, y")} -{" "}
                                  {format(dateRange.to, "LLL dd, y")}
                                </>
                              ) : (
                                format(dateRange.from, "LLL dd, y")
                              )
                            ) : (
                              <span>Pick a date range</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
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
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Payment Method</label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="w-full h-9">
                          <SelectValue placeholder="All Methods" />
                        </SelectTrigger>
                        <SelectContent side="bottom">
                          <SelectItem value="All">All Methods</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Check">Check</SelectItem>
                          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
       </div>

      <Card>
        <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold">Payment History</CardTitle>
            </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Supplier</TableHead>
                  <TableHead className="font-semibold">Reference</TableHead>
                  <TableHead className="font-semibold">Method</TableHead>
                  <TableHead className="font-semibold">Notes</TableHead>
                  <TableHead className="text-right font-semibold">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}><div className="h-10 w-full animate-pulse bg-muted rounded-md" /></TableCell>
                      </TableRow>
                    ))
                ) : payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No payments found.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="text-sm">{format(new Date(payment.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="font-medium">{payment.supplierName}</TableCell>
                      <TableCell className="font-mono text-xs">{payment.reference || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">{payment.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={payment.notes}>{payment.notes || '-'}</TableCell>
                      <TableCell className="text-right font-bold text-primary">
                          {formatCurrency(payment.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="py-4 border-t mt-4">
             <DataTablePagination 
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                totalItems={pagination.totalItems}
                setPage={(page) => setPagination(prev => ({ ...prev, currentPage: page }))}
                setPageSize={(size) => setPagination(prev => ({ ...prev, pageSize: size, currentPage: 1 }))}
             />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
