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
import type { Product } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Search, X } from 'lucide-react';
import { DateRange } from 'react-day-picker';

type ProductSalesData = {
  product: {
    id: string;
    name: string;
    sku: string;
    category: string;
    brand: string;
    unitOfMeasure: string;
  };
  unitsSold: number;
  totalRevenue: number;
  numberOfSales: number;
  avgPricePerUnit: number;
};

export default function SalesByProductPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [productSales, setProductSales] = useState<ProductSalesData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSalesByProduct = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange?.from) {
        params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange?.to) {
        params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
      }

      const response = await fetch(`/api/sales/by-product?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setProductSales(result.data);
      } else {
        console.error('Failed to fetch sales by product:', result.error);
        setProductSales([]);
      }
    } catch (error) {
      console.error('Error fetching sales by product:', error);
      setProductSales([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesByProduct();
  }, [dateRange]);

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
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <div className="text-muted-foreground">Loading sales data...</div>
          </div>
        ) : (
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
                filteredProductSales.map((item) => (
                  <TableRow key={item.product.id}>
                    <TableCell className="font-medium">{item.product.name}</TableCell>
                    <TableCell>{item.product.sku}</TableCell>
                    <TableCell className="hidden md:table-cell">{item.product.category}</TableCell>
                    <TableCell className="text-right">{item.unitsSold}</TableCell>
                    <TableCell className="text-right">
                      ₱{item.totalRevenue.toFixed(2)}
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
        )}
      </CardContent>
    </Card>
  );
}
