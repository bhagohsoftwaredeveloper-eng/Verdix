'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Search, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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



export default function SalesDetailsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [terminal, setTerminal] = useState<string>('all');
  const [sales, setSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10; // Items per page

  // Fetch transactions from new API
  const fetchTransactions = async (page = 1) => {
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
      }
    } catch (error) {
        console.error("Error fetching transactions:", error);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(currentPage);
  }, [dateRange, terminal, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [dateRange, terminal]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
    }
  };

  const filteredSales = sales.filter((sale) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      sale.id.toString().toLowerCase().includes(term) ||
      sale.customer?.name?.toLowerCase().includes(term) ||
      sale.cashier?.toLowerCase().includes(term)
    );
  });

  const resetFilters = () => {
    setSearchTerm('');
    setDateRange(undefined);
    setTerminal('all');
    setCurrentPage(1);
  };

  const handleViewDetail = (tx: any) => {
      setSelectedTx(tx);
      setIsDetailOpen(true);
  };

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
    <div className="space-y-6">
      <Card>
        {/* ... (existing CardHeader) */}
        <CardHeader>
          <CardTitle>Sales Log</CardTitle>
          <CardDescription>
            Detailed log of all point of sale transactions.
          </CardDescription>
          <div className="flex items-center justify-between gap-4 pt-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search ID, customer, cashier..."
                className="pl-8 sm:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <TerminalSelector 
                terminalId={terminal} 
                onTerminalChange={setTerminal} 
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
              <Button variant="ghost" onClick={resetFilters} size="icon" className={(searchTerm || dateRange || terminal !== 'all') ? 'visible' : 'invisible'}>
                <X className="h-4 w-4" />
                <span className="sr-only">Reset filters</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Terminal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length > 0 ? (
                filteredSales.map((sale) => (
                  <TableRow key={sale.posTransactionId}>
                    <TableCell className="font-medium font-mono">
                      {sale.posTransactionId}
                    </TableCell>
                    <TableCell>
                      {format(new Date(sale.date), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell>{sale.customer?.name || 'Walk-in'}</TableCell>
                    <TableCell>{sale.cashier || 'N/A'}</TableCell>
                    <TableCell>{sale.terminal || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                            sale.transactionType === 'void' ? 'destructive' : 
                            sale.transactionType === 'return' ? 'secondary' : 'default' // Changed 'warning' to 'secondary' as warning might not exist in standard badge
                        }
                      >
                        {sale.transactionType === 'sale' ? 'Paid' : 
                         sale.transactionType === 'void' ? 'Voided' : 
                         sale.transactionType === 'return' ? 'Returned' : sale.transactionType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₱{sale.total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                         <Button variant="ghost" size="icon" onClick={() => handleViewDetail(sale)}>
                            <Eye className="h-4 w-4" />
                         </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                    No transactions found.
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

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>Transaction Details</DialogTitle>
                <DialogDescription>ID: {selectedTx?.posTransactionId}</DialogDescription>
            </DialogHeader>
             {selectedTx && (
                 <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-2 text-sm">
                         <span className="text-muted-foreground">Date:</span>
                         <span className="font-medium">{format(new Date(selectedTx.date), 'PPpp')}</span>
                         
                         <span className="text-muted-foreground">Customer:</span>
                         <span className="font-medium">{selectedTx.customer?.name || 'Walk-in'}</span>
                         
                         <span className="text-muted-foreground">Cashier:</span>
                         <span className="font-medium">{selectedTx.cashier || 'N/A'}</span>
                         
                         <span className="text-muted-foreground">Terminal:</span>
                         <span className="font-medium">{selectedTx.terminal || 'N/A'}</span>
                         
                         <span className="text-muted-foreground">Payment Method:</span>
                         <span className="font-medium">{selectedTx.paymentMethod || 'N/A'}</span>
                         
                         <span className="text-muted-foreground">Status:</span>
                         <span className="font-medium capitalize">{selectedTx.transactionType}</span>
                     </div>
                     <div className="border-t pt-4 flex justify-between items-center">
                         <span className="font-semibold">Total Amount</span>
                         <span className="font-bold text-lg">₱{selectedTx.total.toFixed(2)}</span>
                     </div>
                 </div>
             )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
