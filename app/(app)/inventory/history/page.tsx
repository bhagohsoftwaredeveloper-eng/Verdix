'use client';

import { useMemo, useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import type { StockAdjustment } from '@/lib/types';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarIcon, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStockAdjustments, getStockAdjustmentsCount } from './actions';

function AdjustmentRow({ adjustment }: { adjustment: StockAdjustment }) {
  const formattedDate = useMemo(() => {
    try {
      return format(new Date(adjustment.date), 'PP p');
    } catch (error) {
      return 'Invalid Date';
    }
  }, [adjustment.date]);

  return (
    <TableRow key={adjustment.id}>
      <TableCell className="font-medium">{adjustment.product?.name || adjustment.productName}</TableCell>
      <TableCell suppressHydrationWarning>{formattedDate}</TableCell>
      <TableCell>
         <Badge variant={adjustment.quantity > 0 ? "default" : "destructive"} className="text-sm">
          {adjustment.quantity > 0 ? '+' : ''}{adjustment.quantity}
        </Badge>
      </TableCell>
      <TableCell>{adjustment.reason}</TableCell>
      <TableCell className="text-right">{adjustment.newStock}</TableCell>
    </TableRow>
  );
}

function AdjustmentSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
      <TableCell><Skeleton className="h-6 w-12 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-5 w-10 ml-auto" /></TableCell>
    </TableRow>
  );
}



export default function AdjustmentHistoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    const fetchAdjustments = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedAdjustments = await getStockAdjustments();
        setAdjustments(fetchedAdjustments);
      } catch (error) {
        console.error('Failed to fetch stock adjustments:', error);
        setError('Failed to load adjustment history. Please try again.');
        setAdjustments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdjustments();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, dateRange]);

  const filteredAdjustments = useMemo(() => {
    if (!adjustments) return [];

    return adjustments.filter(adj => {
        // Date filter
        const adjDate = new Date(adj.date);
        if (dateRange?.from && adjDate < dateRange.from) return false;
        if (dateRange?.to) {
            const toDate = new Date(dateRange.to);
            toDate.setHours(23, 59, 59, 999);
            if (adjDate > toDate) return false;
        }

        // Search term filter
        const term = searchTerm.toLowerCase();
        if (term && !((adj.product?.name || adj.productName)?.toLowerCase().includes(term) || adj.reason.toLowerCase().includes(term))) {
            return false;
        }

        return true;
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  }, [adjustments, dateRange, searchTerm]);

  const totalPages = Math.ceil(filteredAdjustments.length / pageSize);
  const paginatedAdjustments = filteredAdjustments.slice((page - 1) * pageSize, page * pageSize);

  const resetFilters = () => {
    setSearchTerm('');
    setDateRange(undefined);
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Adjustment History</CardTitle>
        <CardDescription>
          A log of all manual stock adjustments made to your products.
        </CardDescription>
        <div className="flex items-center justify-between gap-4 pt-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by product or reason..."
              className="pl-8 sm:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {error && <div className="text-destructive text-sm font-medium items-center flex">{error}</div>}
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
            {(searchTerm || dateRange) && (
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
              <TableHead>Product</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Resulting Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => <AdjustmentSkeleton key={i} />)}
            {!isLoading && paginatedAdjustments.length > 0 ? (
              paginatedAdjustments.map((adj) => (
                <AdjustmentRow key={adj.id} adjustment={adj} />
              ))
            ) : (
              !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No adjustments found for the selected criteria.
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {filteredAdjustments.length === 0 ? 0 : ((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, filteredAdjustments.length)} of {filteredAdjustments.length} entries
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm">Page {page} of {totalPages || 1}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages || totalPages === 0}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
