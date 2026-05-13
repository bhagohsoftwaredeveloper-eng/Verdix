
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
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Pencil, Minus, Plus, ClipboardCheck, ArrowRight, Tags, Search, ChevronDown, LayoutGrid, List, CornerDownRight, MoveHorizontal, Kanban, History, MoreHorizontal, Layers, Rows3, PackageOpen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { BatchInventoryDrawer } from './BatchInventoryDrawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StockTransferDialog } from './StockTransferDialog';
import { cn, formatQuantity, formatStockQuantity } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useLiveRefresh, dispatchStockUpdate } from '@/hooks/use-live-refresh';
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

function StockAdjustmentDialog({ product, children, defaultReason, onSuccess, requireConfirmation, open, onOpenChange }: { product: Product, children?: React.ReactNode, defaultReason?: string, onSuccess?: () => void, requireConfirmation?: boolean, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState(defaultReason || '');
  const [customReason, setCustomReason] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');

  const [physicalCount, setPhysicalCount] = useState<number | null>(null);

  const [childProducts, setChildProducts] = useState<Product[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);

  const isPhysicalCountMode = defaultReason === 'Physical Count';

  const dialogTitle = isPhysicalCountMode ? `Physical Count` : `Adjust Stock`;

  const variance = useMemo(() => {
    if (isPhysicalCountMode && physicalCount !== null) {
      return physicalCount - product.stock;
    }
    return 0;
  }, [isPhysicalCountMode, physicalCount, product.stock]);

  const projectedStock = useMemo(() => {
    const adj = adjustmentType === 'add' ? quantity : -quantity;
    return Math.max(0, product.stock + adj);
  }, [product.stock, quantity, adjustmentType]);

  const reasons = {
    add: ['New Shipment', 'Customer Return', 'Stock Correction', 'Found in Warehouse', 'Other'],
    remove: ['Damage', 'Expired', 'Lost/Theft', 'Internal Use', 'Stock Correction', 'Other']
  };

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
      setCustomReason('');
      setQuantity(0);
      setAdjustmentType('add');
      setPhysicalCount(Number(product.stock));
      setChildProducts([]);
    }
  }, [isOpen, defaultReason, product.stock]);


  const handleQuantityChange = (value: string) => {
    const num = parseFloat(value);
    setQuantity(isNaN(num) || num < 0 ? 0 : num);
  };

  const handlePhysicalCountChange = (value: string) => {
    if (value === '') {
        setPhysicalCount(null);
        return;
    }
    const num = parseFloat(value);
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
      const effectiveReason = reason === 'Other' ? customReason : reason;
      if (!quantity || !effectiveReason) {
        toast({
          variant: 'destructive',
          title: 'Missing Information',
          description: 'Please enter a quantity and reason.',
        });
        return;
      }
      const signedQuantity = adjustmentType === 'add' ? quantity : -quantity;
      adjustment = signedQuantity; 
      finalReason = effectiveReason;
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
      dispatchStockUpdate();
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
     <div className="space-y-6 py-4">
        <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-2xl border border-dashed border-muted-foreground/20">
            <span className="text-sm text-muted-foreground mb-1">Current Balance</span>
            <span className="text-4xl font-bold">{formatQuantity(product.stock, product.unitOfMeasure)}</span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">{product.unitOfMeasure}</span>
        </div>

        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="physicalCount" className="text-sm font-medium">Actual Quantity Counted</Label>
                <div className="relative">
                    <Input
                        id="physicalCount"
                        type="number"
                        value={physicalCount === null ? '' : physicalCount}
                        onChange={(e) => handlePhysicalCountChange(e.target.value)}
                        onBlur={() => {
                          const isDecimal = product.unitOfMeasure && (product.unitOfMeasure.toLowerCase() === 'kilogram' || product.unitOfMeasure.toLowerCase() === 'kg');
                          if (!isDecimal && physicalCount !== null) {
                            setPhysicalCount(Math.round(physicalCount));
                          }
                        }}
                        step={(product.unitOfMeasure && (product.unitOfMeasure.toLowerCase() === 'kilogram' || product.unitOfMeasure.toLowerCase() === 'kg')) ? "0.001" : "1"}
                        className="text-lg h-12 pl-4 pr-12 font-semibold"
                        placeholder="0"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                        {product.unitOfMeasure}
                    </div>
                </div>
            </div>

            {physicalCount !== null && (
                <div className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-all duration-300",
                    variance === 0 ? "bg-muted/50 border-muted" : 
                    variance > 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-destructive/5 border-destructive/20"
                )}>
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            variance === 0 ? "bg-muted text-muted-foreground" : 
                            variance > 0 ? "bg-emerald-500/20 text-emerald-600" : "bg-destructive/20 text-destructive"
                        )}>
                            {variance === 0 ? <ArrowRight className="h-5 w-5" /> : 
                             variance > 0 ? <Plus className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase">Inventory Variance</p>
                            <p className={cn(
                                "text-sm font-bold",
                                variance === 0 ? "text-muted-foreground" : 
                                variance > 0 ? "text-emerald-600" : "text-destructive"
                            )}>
                                {variance > 0 ? '+' : ''}{formatQuantity(variance, product.unitOfMeasure)} {product.unitOfMeasure}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="ghost" onClick={() => setIsOpen(false)} className="flex-1 sm:flex-none">Cancel</Button>
          <Button 
            onClick={handleAdjustStock} 
            disabled={physicalCount === null}
            className="flex-1 sm:flex-none px-8"
          >
            Submit Physical Count
          </Button>
        </DialogFooter>
    </div>
  );

  const renderStandardMode = () => {
    return (
      <div className="space-y-6 py-4">
          <Tabs value={adjustmentType} onValueChange={(val) => setAdjustmentType(val as 'add' | 'remove')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-muted/50">
                <TabsTrigger value="add" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Stock
                </TabsTrigger>
                <TabsTrigger value="remove" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-destructive data-[state=active]:shadow-sm">
                    <Minus className="mr-2 h-4 w-4" />
                    Remove Stock
                </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quantity" className="text-sm font-medium">Quantity to {adjustmentType === 'add' ? 'Add' : 'Remove'}</Label>
                <div className="relative">
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity === 0 ? '' : quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    className="text-lg h-12 pl-4 pr-12 font-semibold"
                    placeholder="0"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                    {product.unitOfMeasure}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason" className="text-sm font-medium">Reason for Adjustment</Label>
                <Select value={reason} onValueChange={setReason} disabled={!!defaultReason}>
                    <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select a reason..." />
                    </SelectTrigger>
                    <SelectContent>
                        {reasons[adjustmentType].map((r) => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>

              {reason === 'Other' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Label htmlFor="customReason" className="text-sm font-medium">Custom Reason</Label>
                    <Input
                        id="customReason"
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        placeholder="Please specify..."
                        className="h-11"
                    />
                </div>
              )}
          </div>

          <div className="bg-muted/30 rounded-2xl p-4 border border-muted-foreground/10">
              <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground font-medium text-xs uppercase tracking-tight">Projected Impact</span>
                  <Badge variant={adjustmentType === 'add' ? "secondary" : "destructive"} className="text-[10px] h-5">
                      {adjustmentType === 'add' ? 'Stock Increase' : 'Stock Decrease'}
                  </Badge>
              </div>
              <div className="flex items-center justify-between">
                  <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Current</p>
                       <p className="text-lg font-semibold">{formatQuantity(product.stock, product.unitOfMeasure)}</p>
                  </div>
                  <div className="flex items-center text-muted-foreground/40">
                      <div className="w-8 h-px bg-current mx-2" />
                      <div className={cn(
                          "flex items-center justify-center p-1 rounded-full",
                          adjustmentType === 'add' ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                      )}>
                          {adjustmentType === 'add' ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      </div>
                      <div className="w-8 h-px bg-current mx-2" />
                  </div>
                  <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Adjustment</p>
                      <p className={cn(
                          "text-lg font-semibold",
                          adjustmentType === 'add' ? "text-primary" : "text-destructive"
                      )}>{formatQuantity(quantity, product.unitOfMeasure)}</p>
                  </div>
                  <div className="flex items-center text-muted-foreground/40 px-2">
                      <span className="text-xl font-light">=</span>
                  </div>
                  <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">New Total</p>
                       <p className="text-xl font-bold">{formatQuantity(projectedStock, product.unitOfMeasure)}</p>
                  </div>
              </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setIsOpen(false)} className="flex-1 sm:flex-none">Cancel</Button>
            <Button
              onClick={handleAdjustStock}
              disabled={quantity === 0 || !(reason === 'Other' ? customReason.trim() : reason.trim())}
              variant={adjustmentType === 'add' ? 'default' : 'destructive'}
              className="flex-1 sm:flex-none px-8 h-11"
            >
              Confirm Adjustment
            </Button>
          </DialogFooter>
      </div>
    );
  };


  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {children && (
          <DialogTrigger asChild>
            {children}
          </DialogTrigger>
        )}
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              Current stock: {formatQuantity(product.stock, product.unitOfMeasure)}. {isPhysicalCountMode ? 'Enter the new physically counted quantity.' : 'Select whether to add or remove stock and provide a reason.'}
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
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isCountOpen, setIsCountOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

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
    <Card className="relative h-full min-h-[220px] flex flex-col shadow-sm hover:shadow-md transition-all duration-300">
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-medium text-lg flex items-center gap-2 pr-8">
              {product.name}
              {hasChildren && (
                <Badge variant="outline" className="text-xs px-2 py-0.5 whitespace-nowrap">
                  Group
                </Badge>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
            {product.barcode && (
              <p className="text-sm text-muted-foreground font-mono">BC: {product.barcode}</p>
            )}
          </div>
          <div className={cn("flex items-center gap-2", hasChildren && "mr-10")}>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setIsAdjustOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Adjust Stock</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsCountOpen(true)}>
                  <ClipboardCheck className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Physical Count</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setIsTransferOpen(true)}>
                  <MoveHorizontal className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Transfer Stock</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <StockAdjustmentDialog 
          product={product} 
          onSuccess={onSuccess} 
          requireConfirmation={requireAdjustmentConfirmation}
          open={isAdjustOpen}
          onOpenChange={setIsAdjustOpen}
        />
        <StockAdjustmentDialog 
          product={product} 
          defaultReason="Physical Count" 
          onSuccess={onSuccess} 
          requireConfirmation={requireAdjustmentConfirmation}
          open={isCountOpen}
          onOpenChange={setIsCountOpen}
        />
        <StockTransferDialog 
          product={product} 
          onSuccess={onSuccess} 
          requireConfirmation={requireTransferConfirmation}
          open={isTransferOpen}
          onOpenChange={setIsTransferOpen}
        />

        <div className="mt-auto pt-4 flex flex-wrap items-center gap-4 border-t border-muted/30 text-xs sm:text-sm">
          <span className="text-sm">
            <span className="font-medium">{formatStockQuantity(displayStock, product.unitOfMeasure)}</span> {product.unitOfMeasure}
          </span>
          <Badge variant={badgeVariant} className="text-xs">{badgeText}</Badge>
          {product.hasPendingApproval && (
            <Badge variant="outline" className="text-xs border-amber-500 text-amber-500 bg-amber-500/10">
              Pending Approval
            </Badge>
          )}
          <span className="text-sm text-muted-foreground">
            Reorder at: {formatStockQuantity(product.reorderPoint, product.unitOfMeasure)}
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
      </CardContent>
    </Card>
  );
}

interface ProductWithChildren extends Product {
  children?: Product[];
}

function CondensedProductRow({ product, isLast = false, onSuccess, requireAdjustmentConfirmation, requireTransferConfirmation }: { product: Product, isLast?: boolean, onSuccess?: () => void, requireAdjustmentConfirmation?: boolean, requireTransferConfirmation?: boolean }) {
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
      ? 'Out'
      : stockStatus === 'low-stock'
      ? 'Low'
      : 'In';

  return (
    <div className="relative flex items-center gap-3 pl-10 py-1.5 pr-2 hover:bg-muted/30 transition-colors rounded-lg group mx-1">
      {/* Connector lines */}
      <div className={cn(
        "absolute left-5 top-0 w-px bg-muted",
        isLast ? "h-1/2" : "h-full"
      )} />
      <div className="absolute left-5 top-1/2 w-3 h-px bg-muted" />

      {/* Product info slab */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-xs truncate" title={product.name}>{product.name}</span>
          {product.hasPendingApproval && (
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
          )}
        </div>
        <p className="text-[9px] text-muted-foreground truncate uppercase font-mono">
          SKU: {product.sku} {product.barcode && `| BC: ${product.barcode}`}
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="text-right">
          <div className="text-xs font-bold leading-none">{formatStockQuantity(displayStock, product.unitOfMeasure)} <span className="text-[9px] font-normal text-muted-foreground">{product.unitOfMeasure}</span></div>
          <Badge variant={badgeVariant} className="text-[8px] px-1 py-0 h-3.5 mt-0.5 uppercase tracking-tighter">{badgeText}</Badge>
        </div>
        
        <ProductRowActions 
           product={product} 
           onSuccess={onSuccess} 
           requireAdjustmentConfirmation={requireAdjustmentConfirmation}
           requireTransferConfirmation={requireTransferConfirmation}
        />
      </div>
    </div>
  );
}

function ProductGroup({ productGroup, onSuccess, requireAdjustmentConfirmation, requireTransferConfirmation }: { productGroup: ProductWithChildren, onSuccess?: () => void, requireAdjustmentConfirmation?: boolean, requireTransferConfirmation?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = productGroup.children && productGroup.children.length > 0;

  return (
    <div className={cn(
      "flex flex-col transition-all duration-300 rounded-2xl h-full",
      isExpanded ? "ring-1 ring-border bg-muted/20 p-1 shadow-sm" : "bg-transparent"
    )}>
      {/* Parent Product */}
      <div className="relative flex-1 flex flex-col">
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
            className="absolute right-10 top-4 z-10 h-8 w-8 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-500", isExpanded && "rotate-180")} />
          </Button>
        )}
      </div>

      {/* Child Products Unified List - CSS Transition for height */}
      <div className={cn(
        "grid transition-all duration-300 ease-in-out",
        isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}>
        <div className="overflow-hidden">
          <div className="py-1 mt-1 space-y-0.5">
             {productGroup.children!.map((childProduct, index) => (
                <CondensedProductRow 
                  key={childProduct.id} 
                  product={childProduct} 
                  isLast={index === productGroup.children!.length - 1}
                  onSuccess={onSuccess} 
                  requireAdjustmentConfirmation={requireAdjustmentConfirmation}
                  requireTransferConfirmation={requireTransferConfirmation}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductRowActions({ product, onSuccess, requireAdjustmentConfirmation, requireTransferConfirmation }: { product: Product, onSuccess?: () => void, requireAdjustmentConfirmation?: boolean, requireTransferConfirmation?: boolean }) {
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isCountOpen, setIsCountOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  return (
    <>
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
          <DropdownMenuItem onSelect={() => setIsAdjustOpen(true)}>
            <Pencil className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Adjust Stock</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsCountOpen(true)}>
            <ClipboardCheck className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Physical Count</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsTransferOpen(true)}>
            <MoveHorizontal className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Transfer Stock</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <StockAdjustmentDialog 
        product={product} 
        onSuccess={onSuccess} 
        requireConfirmation={requireAdjustmentConfirmation}
        open={isAdjustOpen}
        onOpenChange={setIsAdjustOpen}
      />
      <StockAdjustmentDialog 
        product={product} 
        defaultReason="Physical Count" 
        onSuccess={onSuccess} 
        requireConfirmation={requireAdjustmentConfirmation}
        open={isCountOpen}
        onOpenChange={setIsCountOpen}
      />
      <StockTransferDialog 
        product={product} 
        onSuccess={onSuccess} 
        requireConfirmation={requireTransferConfirmation}
        open={isTransferOpen}
        onOpenChange={setIsTransferOpen}
      />
    </>
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
        <TableCell className="font-mono text-xs">{productGroup.barcode || '-'}</TableCell>
        <TableCell>
          <span className="font-medium">{formatStockQuantity(displayStock, productGroup.unitOfMeasure)}</span> <span className="text-muted-foreground text-xs">{productGroup.unitOfMeasure}</span>
        </TableCell>
        <TableCell>
          <Badge variant={badgeVariant} className="text-xs">{badgeText}</Badge>
        </TableCell>
        <TableCell className="text-muted-foreground">{formatStockQuantity(productGroup.reorderPoint, productGroup.unitOfMeasure)}</TableCell>
        <TableCell className="text-right whitespace-nowrap">
          <ProductRowActions 
            product={productGroup} 
            onSuccess={onSuccess} 
            requireAdjustmentConfirmation={requireAdjustmentConfirmation}
            requireTransferConfirmation={requireTransferConfirmation}
          />
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
              <TableCell className="text-sm font-mono text-xs">{child.barcode || '-'}</TableCell>
              <TableCell className="text-sm">
                 <span className="font-medium">{formatStockQuantity(child.stock, child.unitOfMeasure)}</span> <span className="text-muted-foreground text-xs">{child.unitOfMeasure}</span>
              </TableCell>
              <TableCell>
                 <Badge variant={childBadgeVariant} className="text-xs">{childBadgeText}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{formatStockQuantity(child.reorderPoint, child.unitOfMeasure)}</TableCell>
              <TableCell className="text-right">
                  <ProductRowActions 
                    product={child} 
                    onSuccess={onSuccess} 
                    requireAdjustmentConfirmation={requireAdjustmentConfirmation}
                    requireTransferConfirmation={requireTransferConfirmation}
                  />
              </TableCell>
            </TableRow>
          );
      })}
    </>
  );
}


export default function InventoryPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'sku'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [isBatchDrawerOpen, setIsBatchDrawerOpen] = useState(false);

  const { data: allLoadedProducts = [], isLoading, refetch } = useQuery({
    queryKey: ['inventoryProducts'],
    queryFn: async () => {
      return getProducts();
    }
  });

  const { data: posSettings } = useQuery({
    queryKey: ['posSettings'],
    queryFn: async () => {
      const response = await fetch('/api/pos-settings');
      if (!response.ok) throw new Error('Failed to fetch POS settings');
      return response.json();
    }
  });

  const loadProducts = useCallback(() => {
    refetch();
  }, [refetch]);

  useLiveRefresh(refetch);

  // Instant client-side search + group + sort — no server call, no loading state
  const products = useMemo(() => {
    const lower = searchTerm.toLowerCase().trim();
    const filtered = lower
      ? allLoadedProducts.filter((p: Product) =>
          p.name.toLowerCase().includes(lower) ||
          p.sku.toLowerCase().includes(lower) ||
          (p.barcode && p.barcode.toLowerCase().includes(lower))
        )
      : allLoadedProducts;

    const grouped: ProductWithChildren[] = [];
    const parentMap = new Map<string, ProductWithChildren>();

    filtered.forEach((p: Product) => {
      if (!p.parentId) {
        const parentItem = { ...p, children: [] };
        grouped.push(parentItem);
        parentMap.set(p.id, parentItem);
      }
    });

    filtered.forEach((p: Product) => {
      if (p.parentId && parentMap.has(p.parentId)) {
        const parent = parentMap.get(p.parentId);
        if (parent && parent.children) {
           parent.children.push(p);
        }
      } else if (p.parentId) {
        grouped.push({ ...p, children: [] });
      }
    });

    grouped.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'stock') return b.stock - a.stock;
      if (sortBy === 'sku') return a.sku.localeCompare(b.sku);
      return 0;
    });

    return grouped;
  }, [allLoadedProducts, searchTerm, sortBy]);

  const totalProducts = products.length;
  const pagedProducts = useMemo(() =>
    products.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [products, currentPage, pageSize]
  );

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

            <div className="flex items-center gap-1 p-1.5 bg-muted/30 rounded-xl border border-border/50 shadow-sm ml-2 overflow-x-auto whitespace-nowrap scrollbar-none w-full md:w-auto">
                <Link href="/inventory/transfer-board">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 gap-2 hover:bg-muted font-medium px-3 flex-shrink-0"
                  >
                      <Kanban className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs">Transfer Board</span>
                  </Button>
                </Link>
                
                <div className="h-4 w-px bg-border/60 mx-1 flex-shrink-0" />

                <Link href="/inventory/shelf-board">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 gap-2 hover:bg-muted font-medium px-3 flex-shrink-0"
                  >
                      <Rows3 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs">Shelf Board</span>
                  </Button>
                </Link>

                <div className="h-4 w-px bg-border/60 mx-1 flex-shrink-0" />

                <Link href="/inventory/bulk-adjustment">
                  <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 gap-2 font-bold text-primary hover:text-primary hover:bg-primary/10 px-3 transition-colors flex-shrink-0"
                  >
                      <Layers className="h-4 w-4" />
                      <span className="text-xs">Bulk Adjustment</span>
                  </Button>
                </Link>

                <div className="h-4 w-px bg-border/60 mx-1 flex-shrink-0" />

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsBatchDrawerOpen(true)} 
                  className="h-8 gap-2 hover:bg-muted font-medium px-3 text-muted-foreground hover:text-foreground flex-shrink-0"
                >
                    <PackageOpen className="h-4 w-4" />
                    <span className="text-xs">Stock Batches</span>
                </Button>

                <div className="h-4 w-px bg-border/60 mx-1 flex-shrink-0" />

                <Link href="/inventory/history">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 gap-2 hover:bg-muted font-medium px-3 text-muted-foreground hover:text-foreground flex-shrink-0"
                    >
                        <History className="h-4 w-4" />
                        <span className="text-xs">History</span>
                    </Button>
                </Link>
            </div>

        </div>
      </div>

      <BatchInventoryDrawer
        open={isBatchDrawerOpen}
        onOpenChange={setIsBatchDrawerOpen}
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
          {pagedProducts.map((product) => (
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
                <TableHead>Barcode</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reorder Pt</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedProducts.map((product) => (
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
