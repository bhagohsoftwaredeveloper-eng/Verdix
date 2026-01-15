
'use client';

import Image from 'next/image';
import Link from 'next/link';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
} from '@/firebase';
import { collection, doc, runTransaction, query, where, getDocs, getDoc } from 'firebase/firestore';
import { Product } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect, useMemo } from 'react';
import { Pencil, Minus, Plus, ClipboardCheck, ArrowRight, Tags, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

function StockAdjustmentDialog({ product, children, defaultReason }: { product: Product, children: React.ReactNode, defaultReason?: string }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState(defaultReason || '');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');

  const [physicalCount, setPhysicalCount] = useState<number | null>(null);
  
  const isPhysicalCountMode = defaultReason === 'Physical Count';

  const variance = useMemo(() => {
    if (isPhysicalCountMode && physicalCount !== null) {
      return physicalCount - product.stock;
    }
    return 0;
  }, [isPhysicalCountMode, physicalCount, product.stock]);

  useEffect(() => {
    if (isOpen) {
      setReason(defaultReason || '');
      setQuantity(0);
      setAdjustmentType('add');
      setPhysicalCount(product.stock);
    }
  }, [isOpen, defaultReason, product.stock]);


  const handleQuantityChange = (value: string) => {
    const num = parseInt(value, 10);
    setQuantity(isNaN(num) || num < 0 ? 0 : num);
  };
  
  const handlePhysicalCountChange = (value: string) => {
    if (value === '') {
        setPhysicalCount(null);
        return;
    }
    const num = parseInt(value, 10);
    setPhysicalCount(isNaN(num) || num < 0 ? 0 : num);
  };

  const handleAdjustStock = async () => {
    if (!firestore) return;

    let adjustment: number;
    let finalReason: string;

    if (isPhysicalCountMode) {
      if (physicalCount === null) {
        toast({
          variant: 'destructive',
          title: 'Missing Information',
          description: 'Please enter the physically counted quantity.',
        });
        return;
      }
      adjustment = variance;
      finalReason = 'Physical Count';
    } else {
      if (!quantity || !reason) {
        toast({
          variant: 'destructive',
          title: 'Missing Information',
          description: 'Please enter a quantity and reason.',
        });
        return;
      }
      adjustment = adjustmentType === 'add' ? quantity : -quantity;
      finalReason = reason;
    }

    const newStock = product.stock + adjustment;

    if (newStock < 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Adjustment',
        description: "Stock can't go below zero.",
      });
      return;
    }
    
    if (adjustment === 0) {
        toast({
            title: 'No Change Needed',
            description: 'The stock level is already correct.',
        });
        setIsOpen(false);
        return;
    }

    try {
        await runTransaction(firestore, async (transaction) => {
            const productRef = doc(firestore, 'products', product.id);
            
            // Update the current product's stock and log the adjustment
            transaction.update(productRef, { stock: newStock });
            const adjustmentLogRef = doc(collection(firestore, `products/${product.id}/stockAdjustments`));
            transaction.set(adjustmentLogRef, {
                productId: product.id,
                productName: product.name,
                quantity: adjustment,
                reason: finalReason,
                date: new Date().toISOString(),
                newStock,
            });

            // If it's a child product, update the parent's stock
            if (product.parentId) {
                const parentRef = doc(firestore, 'products', product.parentId);
                const siblingsQuery = query(collection(firestore, 'products'), where('parentId', '==', product.parentId));
                
                const siblingsSnapshot = await getDocs(siblingsQuery); // Use getDocs for read-only in transaction
                
                let newParentStock = 0;
                siblingsSnapshot.forEach(siblingDoc => {
                    const siblingData = siblingDoc.data() as Product;
                    const stock = siblingDoc.id === product.id ? newStock : siblingData.stock;
                    newParentStock += stock * (siblingData.conversionFactor || 1);
                });

                transaction.update(parentRef, { stock: newParentStock });
            }
        });


      toast({
        title: 'Stock Adjusted',
        description: `Stock for ${product.name} has been updated.`,
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Error adjusting stock:', error);
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to adjust stock. Please try again.',
      });
    }
  };
  
  const renderPhysicalCountMode = () => (
     <>
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="physicalCount" className="text-right">
                Physical Count
            </Label>
            <Input
                id="physicalCount"
                type="number"
                value={physicalCount === null ? '' : physicalCount}
                onChange={(e) => handlePhysicalCountChange(e.target.value)}
                className="col-span-3"
                placeholder="Enter new stock total"
            />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reason" className="text-right">
                Reason
                </Label>
                <Input
                id="reason"
                value={reason}
                readOnly
                className="col-span-3 bg-muted"
                />
            </div>
             {physicalCount !== null && (
                 <div className="grid grid-cols-4 items-center gap-4 text-sm">
                    <Label className="text-right">Variance</Label>
                    <div className="col-span-3 flex items-center gap-2">
                        <Badge variant="outline">{product.stock}</Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground"/>
                        <Badge variant="outline">{physicalCount}</Badge>
                        <span className="font-bold text-lg">=</span>
                        <Badge variant={variance === 0 ? "secondary" : variance > 0 ? "default" : "destructive"}>
                           {variance > 0 ? '+' : ''}{variance}
                        </Badge>
                    </div>
                 </div>
            )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAdjustStock} 
            disabled={physicalCount === null}
          >
            Submit Count
          </Button>
        </DialogFooter>
    </>
  );

  const renderStandardMode = () => (
    <>
        <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-2">
                <Button variant={adjustmentType === 'add' ? 'default' : 'outline'} onClick={() => setAdjustmentType('add')}>
                    <Plus className="mr-2 h-4 w-4"/>
                    Add Stock (Positive)
                </Button>
                <Button variant={adjustmentType === 'remove' ? 'destructive' : 'outline'} onClick={() => setAdjustmentType('remove')}>
                    <Minus className="mr-2 h-4 w-4"/>
                    Remove Stock (Negative)
                </Button>
            </div>
            <div className={cn("grid gap-4 rounded-lg border p-4", 
                adjustmentType === 'add' ? 'border-primary/50' : 'border-destructive/50'
            )}>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">
                  Quantity
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={quantity === 0 ? '' : quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., 10"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reason" className="text-right">
                  Reason
                </Label>
                <Input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., New shipment, damaged goods"
                  disabled={!!defaultReason}
                />
              </div>
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAdjustStock} 
            disabled={quantity === 0 || !reason.trim()}
             variant={adjustmentType === 'add' ? 'default' : 'destructive'}
          >
            {`${adjustmentType === 'add' ? 'Add' : 'Remove'} ${quantity} ${quantity === 1 ? 'Unit' : 'Units'}`}
          </Button>
        </DialogFooter>
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isPhysicalCountMode ? `Physical Count for ${product.name}` : `Adjust Stock for ${product.name}`}</DialogTitle>
          <DialogDescription>
            Current stock: {product.stock}. {isPhysicalCountMode ? 'Enter the new physically counted quantity.' : 'Select whether to add or remove stock and provide a reason.'}
          </DialogDescription>
        </DialogHeader>
        {isPhysicalCountMode ? renderPhysicalCountMode() : renderStandardMode()}
      </DialogContent>
    </Dialog>
  );
}


function ProductRow({ product }: { product: Product }) {
  const stockStatus =
    product.stock === 0
      ? 'out-of-stock'
      : product.stock < product.reorderPoint
      ? 'low-stock'
      : 'in-stock';

  const badgeVariant =
    stockStatus === 'out-of-stock'
      ? 'destructive'
      : stockStatus === 'low-stock'
      ? 'secondary'
      : 'default';
  const badgeText =
    stockStatus === 'out-of-stock'
      ? 'Out of Stock'
      : stockStatus === 'low-stock'
      ? 'Low Stock'
      : 'In Stock';

  return (
    <TableRow key={product.id}>
      <TableCell className="hidden sm:table-cell">
        <Image
          alt={product.name}
          className="aspect-square rounded-md object-cover"
          height="64"
          src={product.imageUrl}
          data-ai-hint={product.imageHint}
          width="64"
        />
      </TableCell>
      <TableCell className="font-medium">{product.name}</TableCell>
      <TableCell>{product.sku}</TableCell>
      <TableCell className="hidden md:table-cell">{product.unitOfMeasure}</TableCell>
      <TableCell className="hidden md:table-cell text-center">{product.stock}</TableCell>
      <TableCell>
        <Badge variant={badgeVariant}>{badgeText}</Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell text-right">
        {product.reorderPoint}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex gap-2 justify-end">
            <StockAdjustmentDialog product={product} >
                 <Button variant="outline" size="sm" disabled={product.isSerialized || !product.parentId}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Adjust
                </Button>
            </StockAdjustmentDialog>
            <StockAdjustmentDialog product={product} defaultReason="Physical Count">
                <Button variant="outline" size="sm" disabled={product.isSerialized || !product.parentId}>
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Count
                </Button>
            </StockAdjustmentDialog>
            {product.isSerialized && (
              <Link href={`/inventory/${product.id}/serials`}>
                <Button variant="outline" size="sm">
                  <Tags className="mr-2 h-4 w-4" />
                  Manage Serials
                </Button>
              </Link>
            )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function ProductSkeleton() {
  return (
    <TableRow>
      <TableCell className="hidden sm:table-cell">
        <Skeleton className="w-16 h-16 rounded-md" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-24" />
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Skeleton className="h-5 w-20" />
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Skeleton className="h-5 w-12 mx-auto" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-24 rounded-full" />
      </TableCell>
      <TableCell className="hidden md:table-cell text-right">
        <Skeleton className="h-5 w-10 ml-auto" />
      </TableCell>
       <TableCell className="text-right">
        <div className="flex gap-2 justify-end">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const firestore = useFirestore();
  const productsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'products') : null),
    [firestore]
  );
  const { data: products, isLoading } = useCollection<Product>(productsCollection);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchTerm) return products;
    
    const term = searchTerm.toLowerCase();
    return products.filter(product => 
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Stock Levels</CardTitle>
        <CardDescription>
          View and update your product stock levels.
        </CardDescription>
        <div className="pt-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by product name or SKU..."
              className="pl-8 w-full sm:w-1/3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="hidden md:table-cell">UoM</TableHead>
              <TableHead className="hidden md:table-cell text-center">Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell text-right">
                Reorder Point
              </TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => <ProductSkeleton key={i} />)}
            {filteredProducts?.map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
             {!isLoading && filteredProducts?.length === 0 && (
                <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                    No products found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
