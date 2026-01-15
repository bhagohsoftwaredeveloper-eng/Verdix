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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup } from 'firebase/firestore';
import type { StockAdjustment, Sale, PurchaseOrder, Product } from '@/lib/types';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { CalendarIcon, Search, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

type StockMovement = {
  id: string;
  productName: string;
  date: string;
  type: 'Sale' | 'Purchase' | 'Adjustment';
  quantityChange: number;
  newStock?: number;
};

function MovementRow({ movement }: { movement: StockMovement }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{movement.productName}</TableCell>
      <TableCell>{format(new Date(movement.date), 'PP p')}</TableCell>
      <TableCell>
        <Badge 
          variant={
            movement.type === 'Sale' ? 'secondary' :
            movement.type === 'Purchase' ? 'default' :
            'outline'
          }
        >
          {movement.type}
        </Badge>
      </TableCell>
      <TableCell>
         <Badge variant={movement.quantityChange > 0 ? "default" : "destructive"} className="text-sm">
          {movement.quantityChange > 0 ? '+' : ''}{movement.quantityChange}
        </Badge>
      </TableCell>
       <TableCell className="text-right">{movement.newStock ?? 'N/A'}</TableCell>
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
    const firestore = useFirestore();
    const productsCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'products') : null), [firestore]);
    const { data: products } = useCollection<Product>(productsCollection);
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
                            {products?.map((product) => (
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

export default function StockMovementPage() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const firestore = useFirestore();

  const adjustmentsQuery = useMemoFirebase(() => (firestore ? collectionGroup(firestore, 'stockAdjustments') : null), [firestore]);
  const { data: adjustments, isLoading: isLoadingAdjustments } = useCollection<StockAdjustment>(adjustmentsQuery);

  const salesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'sales') : null), [firestore]);
  const { data: sales, isLoading: isLoadingSales } = useCollection<Sale>(salesQuery);
  
  const purchasesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'purchaseOrders') : null), [firestore]);
  const { data: purchases, isLoading: isLoadingPurchases } = useCollection<PurchaseOrder>(purchasesQuery);

  const isLoading = isLoadingAdjustments || isLoadingSales || isLoadingPurchases;

  const filteredMovements = useMemo(() => {
    const allMovements: StockMovement[] = [];

    // Process adjustments
    adjustments?.forEach(adj => {
        allMovements.push({
            id: adj.id,
            productName: adj.product?.name || 'Unknown Product',
            date: adj.date,
            type: 'Adjustment',
            quantityChange: adj.quantity,
            newStock: adj.newStock
        });
    });

    // Process sales
    sales?.forEach(sale => {
        sale.items.forEach(item => {
            allMovements.push({
                id: `${sale.id}-${item.product.id}`,
                productName: item.product.name,
                date: sale.date,
                type: 'Sale',
                quantityChange: -item.quantity,
            });
        });
    });

    // Process received purchases
    purchases?.filter(p => p.status === 'Received').forEach(purchase => {
        purchase.items.forEach(item => {
            allMovements.push({
                id: `${purchase.id}-${item.productId}`,
                productName: item.productName,
                date: purchase.date,
                type: 'Purchase',
                quantityChange: item.quantity,
            });
        });
    });
    
    return allMovements.filter(mov => {
        // Product filter
        if (selectedProduct && mov.productName !== selectedProduct.name) return false;

        // Type filter
        if (movementType !== 'all' && mov.type.toLowerCase() !== movementType) return false;

        // Date filter
        const movDate = new Date(mov.date);
        if (dateRange?.from && movDate < dateRange.from) return false;
        if (dateRange?.to) {
            const toDate = new Date(dateRange.to);
            toDate.setHours(23, 59, 59, 999);
            if (movDate > toDate) return false;
        }
        
        return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  }, [adjustments, sales, purchases, selectedProduct, movementType, dateRange]);

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
            {!isLoading && filteredMovements.length > 0 ? (
              filteredMovements.map((mov) => (
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
      </CardContent>
    </Card>
  );
}
