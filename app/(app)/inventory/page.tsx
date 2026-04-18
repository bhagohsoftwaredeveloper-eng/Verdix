
'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Product } from '@/lib/types';
import { getProducts } from '../products/actions';
import { adjustStock } from './history/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect, useMemo } from 'react';
import { Pencil, Minus, Plus, ClipboardCheck, ArrowRight, Tags, Search, ChevronDown, LayoutGrid, List, CornerDownRight, MoveHorizontal, Kanban, History, MoreHorizontal, Layers, Rows3 } from 'lucide-react';
import { TransferBoardDrawer } from './TransferBoardDrawer';
import { ShelfBoardDrawer } from './ShelfBoardDrawer';
import { BulkAdjustmentDrawer } from './BulkAdjustmentDrawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StockTransferDialog } from './StockTransferDialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getApiUrl } from '@/lib/api-config';

function StockAdjustmentDialog({ product, children, defaultReason, onSuccess, requireConfirmation }: { product: Product, children: React.ReactNode, defaultReason?: string, onSuccess?: () => void, requireConfirmation?: boolean }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

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

  const processAdjustment = async () => {
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
      adjustment = signedQuantity; 
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
      const userSession = localStorage.getItem('mock-user-session');
      const userId = userSession ? JSON.parse(userSession).uid : 'system';
      const parentResult = await adjustStock(product.id, adjustment, finalReason, userId);
      const res = parentResult as any;

      if (!res.success) {
        toast({
          variant: 'destructive',
          title: 'Adjustment Failed',
          description: res.error || 'Failed to adjust stock.',
        });
        return;
      }

      if (res.pendingApproval) {
        toast({
          title: 'Adjustment Pending Approval',
          description: `Stock adjustment for ${product.name} has been submitted for multi-level approval.`,
        });
      } else {
        toast({
          title: 'Stock Adjusted',
          description: `Stock for ${product.name} has been updated to ${res.newStock}.`,
        });
      }
      setIsOpen(false);
      setIsConfirmOpen(false);
      onSuccess?.(); 
      window.dispatchEvent(new Event('stock-updated'));
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Adjustment Failed',
        description: 'An error occurred while adjusting stock.',
      });
    }
  };

  const handleAdjustStock = () => {
    if (requireConfirmation) {
      setIsConfirmOpen(true);
    } else {
      processAdjustment();
    }
  };
  
  const adjustmentTypeLabel = adjustmentType === 'add' ? 'Addition' : 'Removal';
  const confirmationMessage = isPhysicalCountMode 
    ? `Are you sure you want to update the stock for ${product.name} to ${physicalCount} ${product.unitOfMeasure}? This will record a variance of ${variance > 0 ? '+' : ''}${variance}.`
    : `Are you sure you want to record a ${adjustmentTypeLabel.toLowerCase()} of ${quantity} ${product.unitOfMeasure} for ${product.name}?`;

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
    return (
      <>
          <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-2">
                  <Button variant={adjustmentType === 'add' ? 'default' : 'outline'} onClick={() => setAdjustmentType('add')}>
                      <Plus className="mr-2 h-4 w-4"/>
                      Add Stock
                  </Button>
                  <Button variant={adjustmentType === 'remove' ? 'destructive' : 'outline'} onClick={() => setAdjustmentType('remove')}>
                      <Minus className="mr-2 h-4 w-4"/>
                      Remove Stock
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
                    placeholder="e.g., New shipment"
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
              {`${adjustmentType === 'add' ? 'Add' : 'Remove'} ${quantity} Units`}
            </Button>
          </DialogFooter>
      </>
    );
  };

  return (
    <>
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

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Stock Adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={processAdjustment}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}




function ProductCard({ product, hasChildren = false, onSuccess, requireAdjustmentConfirmation, requireTransferConfirmation }: { product: Product, hasChildren?: boolean, onSuccess?: () => void, requireAdjustmentConfirmation?: boolean, requireTransferConfirmation?: boolean }) {
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
              {product.hasPendingApproval && (
                <Badge variant="outline" className="text-xs border-amber-500 text-amber-500 bg-amber-500/10">
                  Pending Approval
                </Badge>
              )}
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
          <StockAdjustmentDialog product={product} onSuccess={onSuccess} requireConfirmation={requireAdjustmentConfirmation}>
            <Button variant="outline" size="sm" className="flex-1 min-w-0">
              <Pencil className="mr-2 h-4 w-4 flex-shrink-0" />
              Adjust
            </Button>
          </StockAdjustmentDialog>
          <StockAdjustmentDialog product={product} defaultReason="Physical Count" onSuccess={onSuccess} requireConfirmation={requireAdjustmentConfirmation}>
            <Button variant="outline" size="sm" className="flex-1 min-w-0">
              <ClipboardCheck className="mr-2 h-4 w-4 flex-shrink-0" />
              Count
            </Button>
          </StockAdjustmentDialog>
          <StockTransferDialog product={product} onSuccess={onSuccess} requireConfirmation={requireTransferConfirmation}>
            <Button variant="outline" size="sm" className="flex-1 min-w-0">
              <MoveHorizontal className="mr-2 h-4 w-4 flex-shrink-0" />
              Transfer
            </Button>
          </StockTransferDialog>
        </div>
      </CardContent>
    </Card>
  );
}

interface ProductWithChildren extends Product {
  children?: Product[];
}

function ProductGroup({ productGroup, onSuccess, requireAdjustmentConfirmation, requireTransferConfirmation }: { productGroup: ProductWithChildren, onSuccess?: () => void, requireAdjustmentConfirmation?: boolean, requireTransferConfirmation?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = productGroup.children && productGroup.children.length > 0;

  return (
    <div className="space-y-4">
      {/* Parent Product */}
      <div className="relative">
        <ProductCard 
          product={productGroup} 
          hasChildren={hasChildren} 
          onSuccess={onSuccess} 
          requireAdjustmentConfirmation={requireAdjustmentConfirmation}
          requireTransferConfirmation={requireTransferConfirmation}
        />
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
              <ProductCard 
                product={childProduct} 
                onSuccess={onSuccess} 
                requireAdjustmentConfirmation={requireAdjustmentConfirmation}
                requireTransferConfirmation={requireTransferConfirmation}
              />
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

function ProductTableRowGroup({ productGroup, onSuccess, requireAdjustmentConfirmation, requireTransferConfirmation }: { productGroup: ProductWithChildren, onSuccess?: () => void, requireAdjustmentConfirmation?: boolean, requireTransferConfirmation?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = productGroup.children && productGroup.children.length > 0;

  const displayStock = productGroup.stock;
  const stockStatus =
    displayStock === 0
      ? 'out-of-stock'
      : displayStock < productGroup.reorderPoint
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
    <>
      <TableRow className={cn(hasChildren && isExpanded ? "border-b-0" : "")}>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {hasChildren && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
              </Button>
            )}
            {!hasChildren && <div className="w-6" />}
            {productGroup.name}
            {hasChildren && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                Group
              </Badge>
            )}
            {productGroup.hasPendingApproval && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500 text-amber-500 bg-amber-500/10">
                Pending
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>{productGroup.sku}</TableCell>
        <TableCell>
          <span className="font-medium">{displayStock}</span> <span className="text-muted-foreground text-xs">{productGroup.unitOfMeasure}</span>
        </TableCell>
        <TableCell>
          <Badge variant={badgeVariant} className="text-xs">{badgeText}</Badge>
        </TableCell>
        <TableCell className="text-muted-foreground">{productGroup.reorderPoint}</TableCell>
        <TableCell className="text-right whitespace-nowrap">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <StockAdjustmentDialog product={productGroup} onSuccess={onSuccess} requireConfirmation={requireAdjustmentConfirmation}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Pencil className="mr-2 h-4 w-4" />
                  <span>Adjust</span>
                </DropdownMenuItem>
              </StockAdjustmentDialog>
              <StockAdjustmentDialog product={productGroup} defaultReason="Physical Count" onSuccess={onSuccess} requireConfirmation={requireAdjustmentConfirmation}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  <span>Count</span>
                </DropdownMenuItem>
              </StockAdjustmentDialog>
              <StockTransferDialog product={productGroup} onSuccess={onSuccess} requireConfirmation={requireTransferConfirmation}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <MoveHorizontal className="mr-2 h-4 w-4" />
                  <span>Transfer</span>
                </DropdownMenuItem>
              </StockTransferDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      {isExpanded && hasChildren && productGroup.children!.map((child) => {
          const childStockStatus =
            child.stock === 0
              ? 'out-of-stock'
              : child.stock < child.reorderPoint
              ? 'low-stock'
              : 'in-stock';

          const childBadgeVariant =
            childStockStatus === 'out-of-stock'
              ? 'destructive'
              : childStockStatus === 'low-stock'
              ? 'secondary'
              : 'default';
          const childBadgeText =
            childStockStatus === 'out-of-stock'
              ? 'Out of Stock'
              : childStockStatus === 'low-stock'
              ? 'Low Stock'
              : 'In Stock';

          return (
            <TableRow key={child.id} className="bg-muted/30">
              <TableCell className="font-medium pl-8">
                <div className="flex items-center gap-2 text-sm">
                  <CornerDownRight className="h-4 w-4 text-muted-foreground" />
                  {child.name}
                  {child.hasPendingApproval && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500 text-amber-500 bg-amber-500/10">
                      Pending
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm">{child.sku}</TableCell>
              <TableCell className="text-sm">
                 <span className="font-medium">{child.stock}</span> <span className="text-muted-foreground text-xs">{child.unitOfMeasure}</span>
              </TableCell>
              <TableCell>
                 <Badge variant={childBadgeVariant} className="text-xs">{childBadgeText}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{child.reorderPoint}</TableCell>
              <TableCell className="text-right">
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <StockAdjustmentDialog product={child} onSuccess={onSuccess} requireConfirmation={requireAdjustmentConfirmation}>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Adjust</span>
                        </DropdownMenuItem>
                      </StockAdjustmentDialog>
                      <StockAdjustmentDialog product={child} defaultReason="Physical Count" onSuccess={onSuccess} requireConfirmation={requireAdjustmentConfirmation}>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <ClipboardCheck className="mr-2 h-4 w-4" />
                          <span>Count</span>
                        </DropdownMenuItem>
                      </StockAdjustmentDialog>
                      <StockTransferDialog product={child} onSuccess={onSuccess} requireConfirmation={requireTransferConfirmation}>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <MoveHorizontal className="mr-2 h-4 w-4" />
                          <span>Transfer</span>
                        </DropdownMenuItem>
                      </StockTransferDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </TableCell>
            </TableRow>
          );
      })}
    </>
  );
}


export default function InventoryPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductWithChildren[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'sku'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalProducts, setTotalProducts] = useState(0);
  const [posSettings, setPosSettings] = useState<any>(null);
  const [isTransferBoardOpen, setIsTransferBoardOpen] = useState(false);
  const [isShelfBoardOpen, setIsShelfBoardOpen] = useState(false);
  const [isBulkAdjustmentOpen, setIsBulkAdjustmentOpen] = useState(false);

  useEffect(() => {
    loadProducts();
    loadPosSettings();

    const handleUpdate = () => loadProducts();
    window.addEventListener('stock-updated', handleUpdate);
    return () => window.removeEventListener('stock-updated', handleUpdate);
  }, [currentPage, sortBy, searchTerm]);

  const loadPosSettings = async () => {
    try {
      const response = await fetch('/api/pos-settings');
      if (response.ok) {
        const data = await response.json();
        setPosSettings(data);
      }
    } catch (error) {
      console.error('Failed to load POS settings:', error);
    }
  };

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const allProducts = await getProducts();
      
      let filtered = allProducts.filter((p: Product) => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );

      // Group children under parents
      const parents = filtered.filter((p: Product) => !p.parentId);
      const withChildren = parents.map((parent: Product) => ({
        ...parent,
        children: filtered.filter((child: Product) => child.parentId === parent.id)
      }));

      setTotalProducts(withChildren.length);

      // Sort
      const sorted = [...withChildren].sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'stock') return b.stock - a.stock;
        if (sortBy === 'sku') return a.sku.localeCompare(b.sku);
        return 0;
      });

      // Paginate
      const paginated = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
      setProducts(paginated);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load products.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Monitor and adjust stock levels across all products.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
                <TabsList className="grid w-[120px] grid-cols-2">
                    <TabsTrigger value="grid"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
                    <TabsTrigger value="list"><List className="h-4 w-4" /></TabsTrigger>
                </TabsList>
            </Tabs>
            
            <div className="h-8 w-px bg-muted mx-1" />

            <Button variant="outline" onClick={() => setIsTransferBoardOpen(true)}>
                <Kanban className="mr-2 h-4 w-4" />
                Transfer Board
            </Button>
            
            <Button variant="outline" onClick={() => setIsShelfBoardOpen(true)}>
                <Rows3 className="mr-2 h-4 w-4" />
                Shelf Board
            </Button>

            <Button variant="default" className="bg-primary hover:bg-primary/90 shadow-md" onClick={() => setIsBulkAdjustmentOpen(true)}>
                <Layers className="mr-2 h-4 w-4" />
                Bulk Adjustment
            </Button>

            <div className="h-8 w-px bg-muted mx-1" />

            <Link href="/inventory/history">
                <Button variant="ghost" size="sm">
                    <History className="mr-2 h-4 w-4" />
                    History
                </Button>
            </Link>
            <Link href="/inventory/physical-count">
                <Button variant="ghost" size="sm">
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Count
                </Button>
            </Link>
        </div>
      </div>

      <TransferBoardDrawer 
        open={isTransferBoardOpen} 
        onOpenChange={setIsTransferBoardOpen} 
      />
      <ShelfBoardDrawer 
        open={isShelfBoardOpen} 
        onOpenChange={setIsShelfBoardOpen} 
      />
      <BulkAdjustmentDrawer 
        open={isBulkAdjustmentOpen} 
        onOpenChange={setIsBulkAdjustmentOpen}
        onSuccess={loadProducts}
      />

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search products by name or SKU..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
            }}
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="stock">Stock Level</SelectItem>
            <SelectItem value="sku">SKU</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ProductSkeleton key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>No products found</CardTitle>
          <CardDescription>
            Try adjusting your search or filters to find what you're looking for.
          </CardDescription>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
            }}
          >
            Clear Search
          </Button>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductGroup 
              key={product.id} 
              productGroup={product} 
              onSuccess={loadProducts}
              requireAdjustmentConfirmation={posSettings?.requireAdjustmentConfirmation}
              requireTransferConfirmation={posSettings?.requireTransferConfirmation}
            />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reorder Pt</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <ProductTableRowGroup 
                  key={product.id} 
                  productGroup={product} 
                  onSuccess={loadProducts}
                  requireAdjustmentConfirmation={posSettings?.requireAdjustmentConfirmation}
                  requireTransferConfirmation={posSettings?.requireTransferConfirmation}
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {!isLoading && products.length > 0 && (
        <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalProducts)} of {totalProducts} products
            </p>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                >
                    Previous
                </Button>
                <span className="text-sm font-medium">
                    Page {currentPage} of {Math.ceil(totalProducts / pageSize)}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalProducts / pageSize), prev + 1))}
                    disabled={currentPage === Math.ceil(totalProducts / pageSize)}
                >
                    Next
                </Button>
            </div>
        </div>
      )}
    </div>
  );
}
