'use client';

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
import type { Sale } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { useCollection } from '@/firebase';
import { db } from '@/firebase';
import { collection } from 'firebase/firestore';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

export default function SalesByDatePage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  const salesCollection = useMemo(
    () => collection(db, 'sales'),
    []
  );
  
  const [salesSnapshot, salesLoading, salesError] = useCollection(salesCollection);

  const sales = useMemo(() => {
     if (!salesSnapshot) return [];
     return salesSnapshot.docs.map(doc => ({
         id: doc.id,
         ...doc.data()
     } as Sale));
  }, [salesSnapshot]);

  const dailySales = useMemo(() => {
    if (!sales) return [];
    
    const filteredSales = sales.filter(sale => {
      // Robust date parsing
      const dateString = sale.invoiceDate || sale.date || '';
      if (!dateString) return false;
      
      const saleDate = new Date(dateString);
      if (isNaN(saleDate.getTime())) return false;

      if (!dateRange || (!dateRange.from && !dateRange.to)) {
        return true;
      }

      if (dateRange.from && saleDate < dateRange.from) {
        return false;
      }
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (saleDate > toDate) {
          return false;
        }
      }
      return true;
    });

    const salesByDate = new Map<string, { transactionCount: number; totalRevenue: number }>();

    filteredSales.forEach(sale => {
      const dateString = sale.invoiceDate || sale.date || '';
      if (!dateString) return;

      const dateVal = new Date(dateString);
      if (isNaN(dateVal.getTime())) return;
      
      const dateStr = format(dateVal, 'PP');
      const existingEntry = salesByDate.get(dateStr);
      if (existingEntry) {
        existingEntry.transactionCount += 1;
        existingEntry.totalRevenue += sale.total;
      } else {
        salesByDate.set(dateStr, {
          transactionCount: 1,
          totalRevenue: sale.total,
        });
      }
    });

    return Array.from(salesByDate.entries())
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, dateRange]);

  const totalPages = Math.ceil(dailySales.length / pageSize);
  const paginatedSales = dailySales.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
  );

  const resetFilters = () => {
    setDateRange(undefined);
  };
  
  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange]);

  const handlePageChange = (page: number) => {
      if (page >= 1 && page <= totalPages) {
          setCurrentPage(page);
      }
  };

  if (salesError) {
      return (
          <div className="flex items-center justify-center p-8 text-destructive">
              Error loading sales data: {salesError.message}
          </div>
      );
  }

  if (salesLoading) {
       return (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
              Loading sales data...
          </div>
      ); 
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Sales by Date</CardTitle>
            <CardDescription>
              A summary of sales transactions for each day.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[280px] justify-start text-left font-normal",
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
            {dateRange && (
                <Button variant="ghost" onClick={resetFilters} size="icon">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Reset filters</span>
                </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">No. of Transactions</TableHead>
              <TableHead className="text-right">Total Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSales.length > 0 ? (
              paginatedSales.map(({ date, transactionCount, totalRevenue }) => (
                <TableRow key={date}>
                  <TableCell className="font-medium">{date}</TableCell>
                  <TableCell className="text-right">{transactionCount}</TableCell>
                  <TableCell className="text-right">
                    ₱{totalRevenue.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center h-24">
                  No sales found for the selected date range.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious 
                            href="#" 
                            onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(currentPage - 1);
                            }}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                        />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        if (
                            totalPages <= 7 ||
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                            return (
                                <PaginationItem key={page}>
                                    <PaginationLink
                                        href="#"
                                        isActive={page === currentPage}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handlePageChange(page);
                                        }}
                                    >
                                        {page}
                                    </PaginationLink>
                                </PaginationItem>
                            );
                        } else if (
                            (page === currentPage - 2 && currentPage > 3) ||
                            (page === currentPage + 2 && currentPage < totalPages - 2)
                        ) {
                             return <PaginationItem key={`ellipsis-${page}`}><PaginationEllipsis /></PaginationItem>;
                        }
                        
                        return null;
                    })}

                    <PaginationItem>
                        <PaginationNext 
                            href="#" 
                            onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(currentPage + 1);
                            }}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        )}
      </CardContent>
    </Card>
  );
}
