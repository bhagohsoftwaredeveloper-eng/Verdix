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
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold tracking-tight text-foreground">Sales History</h1>
           <p className="text-muted-foreground mt-1">
             Detailed log of all point of sale transactions.
           </p>
        </div>
      </div>

       <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-[0.65rem] h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type="search"
                placeholder="Search ID, customer..."
                className="pl-9 w-full sm:w-[280px] bg-background/50 border-input/50 focus:bg-background transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
             <TerminalSelector 
                terminalId={terminal} 
                onTerminalChange={setTerminal} 
                showAllOption={true} 
             />
             <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[240px] justify-start text-left font-normal bg-background/50 border-input/50 hover:bg-background transition-all",
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
                <PopoverContent className="w-auto p-0 glass-card" align="center">
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
               <Button variant="ghost" onClick={resetFilters} size="icon" className={(searchTerm || dateRange || terminal !== 'all') ? 'visible text-muted-foreground hover:text-destructive' : 'invisible'}>
                <X className="h-4 w-4" />
                <span className="sr-only">Reset filters</span>
              </Button>
      </div>

      <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent border-b border-white/10">
                <TableHead className="w-[120px]">Transaction ID</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Terminal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right w-[80px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length > 0 ? (
                filteredSales.map((sale) => (
                  <TableRow key={sale.posTransactionId} className="group hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium font-mono text-primary">
                      {sale.posTransactionId}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(sale.date), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell className="font-medium">{sale.customer?.name || 'Walk-in'}</TableCell>
                    <TableCell className="text-muted-foreground">{sale.cashier || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{sale.terminal || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        className={cn(
                            "capitalize font-normal border",
                            sale.transactionType === 'void' ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                            sale.transactionType === 'return' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' : 
                            'bg-green-500/10 text-green-600 border-green-500/20'
                        )}
                      >
                        {sale.transactionType === 'sale' ? 'Paid' : sale.transactionType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      ₱{sale.total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                         <Button variant="ghost" size="icon" onClick={() => handleViewDetail(sale)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
                         </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-32 text-muted-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {!isLoading && sales.length > 0 && (
              <div className="p-4 border-t border-border/50 bg-muted/20">
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
        <DialogContent className="max-w-md glass-card border-none shadow-2xl">
            <DialogHeader className="border-b border-border/50 pb-4">
                <DialogTitle className="text-xl">Transaction Details</DialogTitle>
                <DialogDescription className="font-mono text-primary">{selectedTx?.posTransactionId}</DialogDescription>
            </DialogHeader>
             {selectedTx && (
                 <div className="space-y-6 pt-2">
                     <div className="grid grid-cols-2 gap-y-4 text-sm">
                         <div className="flex flex-col gap-1">
                             <span className="text-xs text-muted-foreground uppercase tracking-wider">Date</span>
                             <span className="font-medium">{format(new Date(selectedTx.date), 'PPpp')}</span>
                         </div>
                         
                         <div className="flex flex-col gap-1">
                             <span className="text-xs text-muted-foreground uppercase tracking-wider">Customer</span>
                             <span className="font-medium">{selectedTx.customer?.name || 'Walk-in'}</span>
                         </div>
                         
                         <div className="flex flex-col gap-1">
                             <span className="text-xs text-muted-foreground uppercase tracking-wider">Cashier</span>
                             <span className="font-medium">{selectedTx.cashier || 'N/A'}</span>
                         </div>
                         
                         <div className="flex flex-col gap-1">
                             <span className="text-xs text-muted-foreground uppercase tracking-wider">Terminal</span>
                             <span className="font-medium">{selectedTx.terminal || 'N/A'}</span>
                         </div>
                         
                         <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Payment</span>
                            <span className="font-medium">{selectedTx.paymentMethod || 'N/A'}</span>
                         </div>
                         
                         <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider">Status</span>
                             <Badge 
                                variant="outline"
                                className={cn(
                                    "capitalize w-fit",
                                    selectedTx.transactionType === 'void' ? 'border-destructive text-destructive' : 
                                    selectedTx.transactionType === 'return' ? 'border-orange-500 text-orange-600' : 
                                    'border-green-500 text-green-600'
                                )}
                              >
                                {selectedTx.transactionType}
                              </Badge>
                         </div>
                     </div>
                     <div className="border-t border-border/50 pt-4 flex justify-between items-center bg-muted/30 -mx-6 px-6 -mb-2 py-4 rounded-b-lg">
                         <span className="font-semibold text-muted-foreground">Total Amount</span>
                         <span className="font-bold text-2xl text-primary">₱{selectedTx.total.toFixed(2)}</span>
                     </div>
                 </div>
             )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
