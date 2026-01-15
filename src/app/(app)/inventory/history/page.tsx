'use client';

import { useMemo, useState } from 'react';
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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collectionGroup } from 'firebase/firestore';
import type { StockAdjustment } from '@/lib/types';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarIcon, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

function AdjustmentRow({ adjustment }: { adjustment: StockAdjustment }) {
  return (
    <TableRow key={adjustment.id}>
      <TableCell className="font-medium">{adjustment.product?.name || adjustment.productName}</TableCell>
      <TableCell>{format(new Date(adjustment.date), 'PP p')}</TableCell>
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
  const firestore = useFirestore();

  const adjustmentsCollectionGroup = useMemoFirebase(
    () => (firestore ? collectionGroup(firestore, 'stockAdjustments') : null),
    [firestore]
  );
  
  const { data: adjustments, isLoading } = useCollection<StockAdjustment>(adjustmentsCollectionGroup);

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
            {!isLoading && filteredAdjustments.length > 0 ? (
              filteredAdjustments.map((adj) => (
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
      </CardContent>
    </Card>
  );
}
