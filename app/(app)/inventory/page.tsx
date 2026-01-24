
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
import { Product } from '@/lib/types';
import { getProducts } from '../products/actions';
import { adjustStock } from './history/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect, useMemo } from 'react';
import { Pencil, Minus, Plus, ClipboardCheck, ArrowRight, Tags, Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

function StockAdjustmentDialog({ product, children, defaultReason, onSuccess }: { product: Product, children: React.ReactNode, defaultReason?: string, onSuccess?: () => void }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState(defaultReason || '');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');

  const [physicalCount, setPhysicalCount] = useState<number | null>(null);

  const [childProducts, setChildProducts] = useState<Product[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);

  const isPhysicalCountMode = defaultReason === 'Physical Count';

  const dialogTitle = isPhysicalCountMode ? `Physical Count for ${product.name}` : `Adjust Stock for ${product.name}`;

  const variance = useMemo(() => {
    if (isPhysicalCountMode && physicalCount !== null) {
      return physicalCount - product.stock;
    }
    return 0;
  }, [isPhysicalCountMode, physicalCount, product.stock]);

  // Load child products when dialog opens
  useEffect(() => {
    if (isOpen && !isPhysicalCountMode) {
      loadChildProducts();
    }
  }, [isOpen, isPhysicalCountMode]);

  const loadChildProducts = async () => {
    setIsLoadingChildren(true);
    try {
      const allProducts = await getProducts();
      const children = allProducts.filter((p: Product) => p.parentId === product.id);
      setChildProducts(children);
    } catch (error) {
      console.error('Failed to load child products:', error);
      setChildProducts([]);
    } finally {
      setIsLoadingChildren(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setReason(defaultReason || '');
      setQuantity(0);
      setAdjustmentType('add');
      setPhysicalCount(product.stock);
      setChildProducts([]);
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
      const signedQuantity = adjustmentType === 'add' ? quantity : -quantity;
      adjustment = signedQuantity; // Parent adjustment is just the quantity
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
      // Adjust parent stock
      const parentResult = await adjustStock(product.id, adjustment, finalReason);

      if (!parentResult.success) {
        toast({
          variant: 'destructive',
          title: 'Adjustment Failed',
          description: parentResult.error || 'Failed to adjust parent stock.',
        });
        return;
      }

      toast({
        title: 'Stock Adjusted',
        description: `Stock for ${product.name} has been updated to ${parentResult.newStock}. All child products have been automatically synchronized.`,
      });
      setIsOpen(false);
      onSuccess?.(); // Refresh the product list
      window.dispatchEvent(new Event('stock-updated'));
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Adjustment Failed',
        description: 'An error occurred while adjusting stock.',
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

  const renderStandardMode = () => {
    const signedQuantity = adjustmentType === 'add' ? quantity : -quantity;
    const parentAdjustment = signedQuantity; // Parent shows quantity as-is

    return (
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
                {quantity > 0 && (
                  <div className="grid grid-cols-4 items-center gap-4 text-sm border-t pt-3">
                    <Label className="text-right font-medium">Calculation:</Label>
                    <div className="col-span-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{quantity}</Badge>
                        <span className="font-medium">=</span>
                        <Badge variant={adjustmentType === 'add' ? 'default' : 'destructive'}>
                          {parentAdjustment > 0 ? '+' : ''}{Math.abs(parentAdjustment)}
                        </Badge>
                        <span className="text-muted-foreground">to {product.name}</span>
                      </div>
                    </div>
                  </div>
                )}
                {quantity > 0 && childProducts.length > 0 && (
                  <div className="grid grid-cols-4 items-start gap-4 text-sm border-t pt-3">
                    <Label className="text-right font-medium">Child Products:</Label>
                    <div className="col-span-3 space-y-2">
                      {childProducts.map((child) => {
                        const childConversionFactor = product.conversionFactors ? product.conversionFactors.find(cf => cf.unit === child.unitOfMeasure)?.factor || 1 : 1;
                        const childAdjustmentValue = signedQuantity * childConversionFactor;
                        return (
                          <div key={child.id} className="flex items-center gap-2 text-xs">
                            <span className="font-medium truncate max-w-32">{child.name}:</span>
                            <Badge variant="outline">{child.stock}</Badge>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <Badge variant={adjustmentType === 'add' ? 'default' : 'destructive'}>
                              {childAdjustmentValue > 0 ? '+' : ''}{Math.abs(childAdjustmentValue)}
                            </Badge>
                            <span className="text-muted-foreground">
                              ({signedQuantity > 0 ? '+' : ''}{signedQuantity} × {childConversionFactor})
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {quantity > 0 && childProducts.length === 0 && !isLoadingChildren && (
                  <div className="grid grid-cols-4 items-center gap-4 text-sm border-t pt-3 text-muted-foreground">
                    <Label className="text-right">Child Products:</Label>
                    <div className="col-span-3">No child products found</div>
                  </div>
                )}
                {quantity > 0 && isLoadingChildren && (
                  <div className="grid grid-cols-4 items-center gap-4 text-sm border-t pt-3">
                    <Label className="text-right">Child Products:</Label>
                    <div className="col-span-3 text-muted-foreground">Loading...</div>
                  </div>
                )}
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
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Current stock: {product.stock}. {isPhysicalCountMode ? 'Enter the new physically counted quantity.' : 'Select whether to add or remove stock and provide a reason.'}
          </DialogDescription>
        </DialogHeader>
        {isPhysicalCountMode ? renderPhysicalCountMode() : renderStandardMode()}
      </DialogContent>
    </Dialog>
  );
}




function ProductCard({ product, hasChildren = false, onSuccess }: { product: Product, hasChildren?: boolean, onSuccess?: () => void }) {
  const displayStock = product.stock;

  const stockStatus =
    displayStock === 0
      ? 'out-of-stock'
      : displayStock < product.reorderPoint
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
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Image
            alt={product.name}
            className="aspect-square rounded-md object-cover flex-shrink-0"
            height="64"
            src={product.imageUrl || "https://picsum.photos/seed/default-product/400/300"}
            data-ai-hint={product.imageHint}
            width="64"
          />
          <div className="flex-1">
            <h3 className="font-medium text-lg flex items-center gap-2">
              {product.name}
              {hasChildren && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  Group
                </Badge>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <span className="text-sm">
                <span className="font-medium">{displayStock}</span> {product.unitOfMeasure}
              </span>
              <Badge variant={badgeVariant} className="text-xs">{badgeText}</Badge>
              <span className="text-sm text-muted-foreground">
                Reorder at: {product.reorderPoint}
              </span>
              {product.conversionFactors && product.conversionFactors.length > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">Conversion Factors:</span>
                  {product.conversionFactors.map((cf, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {cf.unit} ×{cf.factor}
                    </Badge>
                  ))}
                </>
              )}
              {(!product.conversionFactors || product.conversionFactors.length === 0) && (
                <>
                  <span className="text-sm text-muted-foreground">Conversion Factor:</span>
                  <Badge variant="outline" className="text-xs">
                    ×{product.conversionFactor || 1}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <StockAdjustmentDialog product={product} onSuccess={onSuccess}>
            <Button variant="outline" size="sm" className="flex-1 min-w-0">
              <Pencil className="mr-2 h-4 w-4 flex-shrink-0" />
              Adjust
            </Button>
          </StockAdjustmentDialog>
          <StockAdjustmentDialog product={product} defaultReason="Physical Count" onSuccess={onSuccess}>
            <Button variant="outline" size="sm" className="flex-1 min-w-0">
              <ClipboardCheck className="mr-2 h-4 w-4 flex-shrink-0" />
              Count
            </Button>
          </StockAdjustmentDialog>
        </div>
      </CardContent>
    </Card>
  );
}

interface ProductWithChildren extends Product {
  children?: Product[];
}

function ProductGroup({ productGroup, onSuccess }: { productGroup: ProductWithChildren, onSuccess?: () => void }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = productGroup.children && productGroup.children.length > 0;

  return (
    <div className="space-y-4">
      {/* Parent Product */}
      <div className="relative">
        <ProductCard product={productGroup} hasChildren={hasChildren} onSuccess={onSuccess} />
        {hasChildren && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-4 top-4 z-10"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
          </Button>
        )}
      </div>

      {/* Child Products */}
      {isExpanded && hasChildren && (
        <div className="ml-8 space-y-4 border-l-2 border-muted pl-4">
          {productGroup.children!.map((childProduct) => (
            <div key={childProduct.id} className="relative">
              <div className="absolute -left-6 top-4 w-4 h-px bg-muted"></div>
              <ProductCard product={childProduct} onSuccess={onSuccess} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Skeleton className="w-16 h-16 rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const fetchedProducts = await getProducts();
      setProducts(fetchedProducts);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
    }
  };

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        await fetchProducts();
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, []);

  const productTree = useMemo(() => {
    if (!products) return [];

    // Build a recursive tree structure
    const buildTree = (parentId: string | null = null, depth = 0): ProductWithChildren[] => {
      return products
        .filter(p => p.parentId === parentId)
        .map(p => ({
          ...p,
          children: depth < 10 ? buildTree(p.id, depth + 1) : [], // Prevent infinite recursion, max depth 10
        }));
    };

    return buildTree();
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!productTree) return [];

    const term = searchTerm.toLowerCase();
    if (!term) return productTree;

    return productTree.filter(product => {
      const parentMatch = product.name.toLowerCase().includes(term) ||
        product.sku?.toLowerCase().includes(term) ||
        product.brand?.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term);

      const childMatch = product.children?.some(
        child => child.name.toLowerCase().includes(term) || child.sku?.toLowerCase().includes(term)
      );

      return parentMatch || childMatch;
    });
  }, [productTree, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Stock Levels</CardTitle>
        <CardDescription>
          View and update your product stock levels. Products are grouped by parent with expandable child products.
        </CardDescription>
        <div className="pt-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by product name, SKU, brand, or category..."
              className="pl-8 w-full sm:w-1/3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {isLoading && Array.from({ length: 5 }).map((_, i) => <ProductSkeleton key={i} />)}
          {!isLoading && filteredProducts.map((productGroup) => (
            <ProductGroup key={productGroup.id} productGroup={productGroup} onSuccess={fetchProducts} />
          ))}
          {!isLoading && filteredProducts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No products found.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
