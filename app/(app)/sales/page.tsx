'use client';

import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { CalendarIcon, Search, X, Loader2 } from 'lucide-react';
import { TerminalSelector } from '@/components/TerminalSelector';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

export default function SalesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [terminalId, setTerminalId] = useState<string>('all');
  const [sales, setSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10; // Number of items per page

  const fetchSales = async (page = 1) => {
    setIsLoading(true);
    try {
        const params = new URLSearchParams();
        if (dateRange?.from) {
            params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
        }
        if (dateRange?.to) {
            params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
        }
        if (terminalId && terminalId !== 'all') {
            params.append('terminalId', terminalId);
        }
        
        // Add pagination params
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        
        const response = await fetch(`/api/sales/transactions?${params.toString()}`);
        const result = await response.json();
        
        if (result.success) {
            setSales(result.data);
            if (result.pagination) {
                setTotalPages(result.pagination.totalPages);
                setCurrentPage(result.pagination.page);
            }
        } else {
            console.error("Failed to fetch sales:", result.error);
        }
    } catch (error) {
        console.error("Error fetching sales:", error);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSales(currentPage);
  }, [dateRange, terminalId, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [dateRange, terminalId]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
    }
  };

  const getStatusInfo = (status: string): { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    switch (status) {
      case 'Paid':
        return { text: 'Paid', variant: 'default' };
      case 'Failed':
      case 'Returned':
      case 'Void':
      case 'Voided':
        return { text: status, variant: 'destructive' };
      case 'Shipped':
      case 'Delivered':
        return { text: status, variant: 'outline' };
      case 'Pending':
      default:
        return { text: 'Due', variant: 'secondary' };
    }
  };

  const filteredSales = sales.filter(sale => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const idMatch = String(sale.id || sale.posTransactionId).toLowerCase().includes(term);
      const customerMatch = sale.customer?.name?.toLowerCase().includes(term);
      return idMatch || customerMatch;
  });

  const resetFilters = () => {
    setSearchTerm('');
    setDateRange(undefined);
    setTerminalId('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || dateRange || terminalId !== 'all';

  // Render pagination items logic
  const renderPaginationItems = () => {
      const items = [];
      const maxVisiblePages = 5;

      if (totalPages <= maxVisiblePages) {
          for (let i = 1; i <= totalPages; i++) {
              items.push(
                  <PaginationItem key={i}>
                      <PaginationLink
                          isActive={currentPage === i}
                          onClick={() => handlePageChange(i)}
                      >
                          {i}
                      </PaginationLink>
                  </PaginationItem>
              );
          }
      } else {
          // Always show first page
          items.push(
              <PaginationItem key={1}>
                  <PaginationLink
                      isActive={currentPage === 1}
                      onClick={() => handlePageChange(1)}
                  >
                      1
                  </PaginationLink>
              </PaginationItem>
          );

          if (currentPage > 3) {
              items.push(
                  <PaginationItem key="ellipsis-start">
                      <PaginationEllipsis />
                  </PaginationItem>
              );
          }

          const start = Math.max(2, currentPage - 1);
          const end = Math.min(totalPages - 1, currentPage + 1);

          for (let i = start; i <= end; i++) {
              items.push(
                  <PaginationItem key={i}>
                      <PaginationLink
                          isActive={currentPage === i}
                          onClick={() => handlePageChange(i)}
                      >
                          {i}
                      </PaginationLink>
                  </PaginationItem>
              );
          }

          if (currentPage < totalPages - 2) {
              items.push(
                  <PaginationItem key="ellipsis-end">
                      <PaginationEllipsis />
                  </PaginationItem>
              );
          }

          // Always show last page
          items.push(
              <PaginationItem key={totalPages}>
                  <PaginationLink
                      isActive={currentPage === totalPages}
                      onClick={() => handlePageChange(totalPages)}
                  >
                      {totalPages}
                  </PaginationLink>
              </PaginationItem>
          );
      }
      return items;
  };

  return (
    <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Sales Transactions</CardTitle>
                <CardDescription>
                  A list of all POS sales to customers.
                </CardDescription>
              </div>
            </div>
             <div className="flex items-center justify-between gap-4 pt-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by ID or customer..."
                  className="pl-8 sm:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <TerminalSelector 
                    terminalId={terminalId}
                    onTerminalChange={setTerminalId}
                    showAllOption={true}
                />
                <div className='w-2'></div>
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
                {hasActiveFilters && (
                  <Button variant="ghost" onClick={resetFilters} size="icon">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Reset filters</span>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="hidden sm:table-cell">Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                             <div className="flex justify-center items-center">
                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                Loading transactions...
                            </div>
                        </TableCell>
                    </TableRow>
                ) : filteredSales.length > 0 ? (
                  filteredSales.map((sale) => {
                    const displayDate = sale.date || sale.invoiceDate;
                    const statusInfo = getStatusInfo(sale.status || sale.sale_status || 'Paid'); 
                    
                    return (
                      <TableRow key={sale.posTransactionId || sale.id}>
                        <TableCell className="font-medium">{(sale.id || sale.posTransactionId).substring(0,8)}...</TableCell>
                        <TableCell>
                          <div className="font-medium">{sale.customer?.name || 'Walk-in'}</div>
                          <div className="text-sm text-muted-foreground hidden md:block">{sale.customer?.contactNumber}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{displayDate ? format(new Date(displayDate), 'PP') : 'N/A'}</TableCell>
                        <TableCell className="hidden sm:table-cell">{sale.paymentMethod}</TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>
                            {statusInfo.text}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">₱{Number(sale.total).toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            No transactions found for the selected criteria.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {!isLoading && sales.length > 0 && (
                <div className="mt-4">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                    aria-disabled={currentPage === 1}
                                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                            {renderPaginationItems()}
                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                    aria-disabled={currentPage === totalPages}
                                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
