
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { TerminalSelector } from '@/components/TerminalSelector';
import { getApiUrl } from '@/lib/api-config';
import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface CashTransfer {
  id: string;
  date: string;
  amount: number;
  type: 'deposit' | 'pickup';
  note: string;
  cashier_name: string;
  terminal_name: string;
  user_id: string;
  terminal_id: string;
}

export default function CashTransferPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date()
  });
  const [terminalId, setTerminalId] = useState<string>('all');
  const [cashierId, setCashierId] = useState<string>('all');
  const [type, setType] = useState<string>('all');
  
  const [data, setData] = useState<CashTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState({ totalCashIn: 0, totalCashOut: 0 });
  const [cashiers, setCashiers] = useState<{uid: string, display_name: string, username: string}[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch cashiers (users)
  useEffect(() => {
    const fetchCashiers = async () => {
        try {
            const res = await fetch(getApiUrl('/users'));
            const data = await res.json();
            
            // The API returns an array directly, or an error object
            if (Array.isArray(data)) {
                setCashiers(data.map((user: any) => ({
                    uid: user.uid,
                    display_name: user.displayName, // Map displayName to display_name
                    username: user.email // Map email (which is username in API) to username
                })));
            }
        } catch (e) {
            console.error(e);
        }
    };
    fetchCashiers();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
        const params = new URLSearchParams();
        if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
        if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
        if (terminalId && terminalId !== 'all') params.append('terminalId', terminalId);
        if (cashierId && cashierId !== 'all') params.append('cashierId', cashierId);
        if (type && type !== 'all') params.append('type', type);
        
        // Add pagination params
        params.append('page', currentPage.toString());
        params.append('limit', pageSize.toString());

        const res = await fetch(getApiUrl(`/pos/cash-transfer?${params.toString()}`));
        const json = await res.json();
        if (json.success) {
            setData(json.data);
            setSummary(json.summary || { totalCashIn: 0, totalCashOut: 0 });
            if (json.pagination) {
                setTotalPages(json.pagination.totalPages);
                setTotalCount(json.pagination.totalCount);
            }
        }
    } catch (e) {
        console.error(e);
        setData([]);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange, terminalId, cashierId, type, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, terminalId, cashierId, type, pageSize]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
    }
  };

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
                        className="cursor-pointer"
                    >
                        {i}
                    </PaginationLink>
                </PaginationItem>
            );
        }
    } else {
        items.push(
            <PaginationItem key={1}>
                <PaginationLink isActive={currentPage === 1} onClick={() => handlePageChange(1)} className="cursor-pointer">1</PaginationLink>
            </PaginationItem>
        );
        if (currentPage > 3) items.push(<PaginationItem key="e1"><PaginationEllipsis /></PaginationItem>);
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        for (let i = start; i <= end; i++) {
            items.push(
                <PaginationItem key={i}>
                    <PaginationLink isActive={currentPage === i} onClick={() => handlePageChange(i)} className="cursor-pointer">{i}</PaginationLink>
                </PaginationItem>
            );
        }
        if (currentPage < totalPages - 2) items.push(<PaginationItem key="e2"><PaginationEllipsis /></PaginationItem>);
        items.push(
            <PaginationItem key={totalPages}>
                <PaginationLink isActive={currentPage === totalPages} onClick={() => handlePageChange(totalPages)} className="cursor-pointer">{totalPages}</PaginationLink>
            </PaginationItem>
        );
    }
    return items;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(val || 0);
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">POS Cash Transfer</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cash In</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">+{formatCurrency(summary.totalCashIn)}</div>
            </CardContent>
          </Card>
          <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cash Out</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">-{formatCurrency(summary.totalCashOut)}</div>
            </CardContent>
          </Card>
      </div>

      <Card>
         <CardHeader>
            <CardTitle>Transfer History</CardTitle>
            <CardDescription>Records of all cash deposits and pickups.</CardDescription>
         </CardHeader>
         <CardContent>
            <div className="flex flex-col gap-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-center">
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-[240px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
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

                    <TerminalSelector terminalId={terminalId} onTerminalChange={setTerminalId} showAllOption={true} />
                    
                    <Select value={cashierId} onValueChange={setCashierId}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All Cashiers" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Cashiers</SelectItem>
                            {cashiers.map(c => (
                                <SelectItem key={c.uid} value={c.uid}>{c.display_name || c.username || c.uid}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="deposit">Cash In (Deposit)</SelectItem>
                            <SelectItem value="pickup">Cash Out (Pickup)</SelectItem>
                        </SelectContent>
                    </Select>
                    
                    <Button variant="ghost" size="icon" onClick={fetchData} title="Refresh">
                        <RefreshCcw className="h-4 w-4" />
                    </Button>
                </div>

                {/* Table */}
                <Table wrapperClassName="max-h-[500px] overflow-auto border rounded-md">
                    <TableHeader className="sticky top-0 z-30 bg-background">
                        <TableRow>
                            <TableHead className="w-[180px] bg-background">Date</TableHead>
                            <TableHead className="bg-background">Terminal</TableHead>
                            <TableHead className="bg-background">Cashier</TableHead>
                            <TableHead className="bg-background">Amount</TableHead>
                            <TableHead className="bg-background">Type</TableHead>
                            <TableHead className="bg-background">Note</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    <div className="flex justify-center items-center gap-2">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                        <span>Loading data...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    No records found for the selected criteria.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell className="font-medium">{format(new Date(row.date), 'PP p')}</TableCell>
                                    <TableCell>{row.terminal_name || row.terminal_id || '-'}</TableCell>
                                    <TableCell>{row.cashier_name || 'Unknown'}</TableCell>
                                    <TableCell className={cn("font-bold", row.type === 'deposit' ? 'text-green-600' : 'text-red-600')}>
                                         {row.type === 'deposit' ? '+' : '-'}{formatCurrency(row.amount)}
                                    </TableCell>
                                    <TableCell>
                                        <span className={cn(
                                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                                            row.type === 'deposit' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                        )}>
                                            {row.type === 'deposit' ? 'Cash In' : 'Cash Out'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={row.note}>{row.note || '-'}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Pagination Controls */}
                {!isLoading && data.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
                        <div className="flex items-center gap-2 order-2 sm:order-1">
                            <Label htmlFor="rows-per-page" className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</Label>
                            <Select 
                                value={pageSize.toString()} 
                                onValueChange={(v) => {
                                    setPageSize(Number(v));
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger id="rows-per-page" className="h-8 w-[70px] text-xs">
                                    <SelectValue placeholder={pageSize.toString()} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                            <span className="text-xs text-muted-foreground ml-2">
                                Total: {totalCount} records
                            </span>
                        </div>
                        <div className="order-1 sm:order-2">
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
                    </div>
                )}
            </div>
         </CardContent>
      </Card>
    </div>
  );
}
