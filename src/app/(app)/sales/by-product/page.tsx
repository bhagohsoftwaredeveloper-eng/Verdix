

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
import type { Product, Sale } from '@/lib/types';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Search, X } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

type ProductSales = {
  product: Product;
  unitsSold: number;
  totalRevenue: number;
};

export default function SalesByProductPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const firestore = useFirestore();
  const salesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sales') : null),
    [firestore]
  );
  const { data: sales } = useCollection<Sale>(salesCollection);

  const productSales = useMemo(() => {
    if (!sales) return [];

    const filteredSales = sales.filter(sale => {
      if (!dateRange || (!dateRange.from && !dateRange.to)) {
        return true;
      }
      const saleDate = new Date(sale.invoiceDate || sale.date);
      if (dateRange.from && saleDate < dateRange.from) {
        return false;
      }
      // Set the time to the end of the day for the 'to' date
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (saleDate > toDate) {
          return false;
        }
      }
      return true;
    });

    const salesMap = new Map<string, ProductSales>();

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const existingEntry = salesMap.get(item.product.id);
        if (existingEntry) {
          existingEntry.unitsSold += item.quantity;
          existingEntry.totalRevenue += item.product.price * item.quantity;
        } else {
          salesMap.set(item.product.id, {
            product: item.product,
            unitsSold: item.quantity,
            totalRevenue: item.product.price * item.quantity,
          });
        }
      });
    });

    return Array.from(salesMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [sales, dateRange]);

  const filteredProductSales = productSales.filter(item =>
    item.product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const resetFilters = () => {
    setSearchTerm('');
    setDateRange(undefined);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales by Product/Service</CardTitle>
        <CardDescription>
          A summary of sales performance for each product.
        </CardDescription>
        <div className="flex items-center justify-between gap-4 pt-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by product name..."
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
            <Button variant="ghost" onClick={resetFilters} size="icon" className={(searchTerm || dateRange) ? 'visible' : 'invisible'}>
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
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Units Sold</TableHead>
              <TableHead className="text-right">Total Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProductSales.length > 0 ? (
              filteredProductSales.map(({ product, unitsSold, totalRevenue }) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell className="hidden md:table-cell">{product.category}</TableCell>
                  <TableCell className="text-right">{unitsSold}</TableCell>
                  <TableCell className="text-right">
                    ₱{totalRevenue.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">
                  No products found for the selected criteria.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
