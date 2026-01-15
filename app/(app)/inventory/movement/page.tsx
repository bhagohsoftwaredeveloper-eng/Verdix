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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { fetchStockMovements } from './actions';
import { mockProducts } from '@/lib/data';
import type { Product, StockMovement } from '@/lib/types';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarIcon, Search, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

function MovementRow({ movement }: { movement: StockMovement }) {
  const typeDisplay = movement.movementType.charAt(0).toUpperCase() + movement.movementType.slice(1);

  return (
    <TableRow>
      <TableCell className="font-medium">{movement.productName}</TableCell>
      <TableCell>{format(new Date(movement.createdAt!), 'PP p')}</TableCell>
      <TableCell>
        <Badge
          variant={
            movement.movementType === 'sale' ? 'secondary' :
            movement.movementType === 'purchase' ? 'default' :
            'outline'
          }
        >
          {typeDisplay}
        </Badge>
      </TableCell>
      <TableCell>
         <Badge variant={movement.quantityChange > 0 ? "default" : "destructive"} className="text-sm">
          {movement.quantityChange > 0 ? '+' : ''}{movement.quantityChange}
        </Badge>
      </TableCell>
       <TableCell className="text-right">{movement.newStock}</TableCell>
    </TableRow>
  );
}

function MovementSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-6 w-12 rounded-full" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-5 w-10 ml-auto" /></TableCell>
    </TableRow>
  );
}

function ProductFilter({ selectedProduct, onSelectProduct }: { selectedProduct: Product | null, onSelectProduct: (product: Product | null) => void }) {
    const products = mockProducts;
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-[200px] justify-between">
                    {selectedProduct ? selectedProduct.name : "Filter by product..."}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder="Search product..." />
                    <CommandList>
                        <CommandEmpty>No product found.</CommandEmpty>
                        <CommandGroup>
                            {products.map((product) => (
                                <CommandItem
                                    key={product.id}
                                    value={product.name}
                                    onSelect={() => {
                                        onSelectProduct(product.id === selectedProduct?.id ? null : product);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", selectedProduct?.id === product.id ? "opacity-100" : "opacity-0")} />
                                    {product.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

// Mock adjustments for demonstration
const mockAdjustments = [
  {
    id: '1',
    product: mockProducts[0],
    quantity: 10,
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    newStock: 160,
  },
];

export default function StockMovementPage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProduct, movementType, dateRange]);

  // Fetch movements on component mount and when filters change
  useEffect(() => {
    const fetchMovements = async () => {
      setIsLoading(true);
      try {
        const filters: any = {};

        if (selectedProduct) {
          filters.productId = selectedProduct.id;
        }

        if (movementType !== 'all') {
          filters.movementType = movementType;
        }

        if (dateRange?.from) {
          filters.dateFrom = dateRange.from.toISOString();
        }

        if (dateRange?.to) {
          filters.dateTo = dateRange.to.toISOString();
        }

        const data = await fetchStockMovements(filters);
        setMovements(data);
      } catch (error) {
        console.error('Failed to fetch stock movements:', error);
        setMovements([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovements();
  }, [selectedProduct, movementType, dateRange]);

  // Calculate pagination
  const totalPages = Math.ceil(movements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMovements = movements.slice(startIndex, endIndex);

  const resetFilters = () => {
    setSelectedProduct(null);
    setMovementType('all');
    setDateRange(undefined);
  };

  const hasActiveFilters = selectedProduct || movementType !== 'all' || dateRange;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Movement</CardTitle>
        <CardDescription>
          A complete log of all inventory changes from sales, purchases, and adjustments.
        </CardDescription>
        <div className="flex items-center justify-between gap-4 pt-4">
          <div className="flex items-center gap-2">
            <ProductFilter selectedProduct={selectedProduct} onSelectProduct={setSelectedProduct} />
            <Select value={movementType} onValueChange={setMovementType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Movement Types</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
              </SelectContent>
            </Select>
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
              <TableHead>Product</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Quantity Change</TableHead>
              <TableHead className="text-right">Resulting Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => <MovementSkeleton key={i} />)}
            {!isLoading && currentMovements.length > 0 ? (
              currentMovements.map((mov) => (
                <MovementRow key={mov.id} movement={mov} />
              ))
            ) : (
              !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No stock movements found for the selected criteria.
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-1 py-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
