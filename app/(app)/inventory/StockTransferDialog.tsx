'use client';

import { useState, useEffect } from 'react';
import { dispatchStockUpdate } from '@/hooks/use-live-refresh';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Product, Warehouse } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, Loader2, Send, WarehouseIcon } from 'lucide-react';
import { getApiUrl } from '@/lib/api-config';
import { formatQuantity } from '@/lib/utils';

interface StockTransferDialogProps {
  product: Product;
  children?: React.ReactNode;
  onSuccess?: () => void;
  requireConfirmation?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function StockTransferDialog({ product, children, onSuccess, requireConfirmation, open, onOpenChange }: StockTransferDialogProps) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchWarehouses();
      setQuantity(0);
      setTargetWarehouseId('');
      setNotes('');
    }
  }, [isOpen]);

  const fetchWarehouses = async () => {
    setIsLoadingWarehouses(true);
    try {
      const response = await fetch(getApiUrl('/warehouses?activeOnly=true'));
      const result = await response.json();
      if (result.success) {
        // Filter out the current warehouse of the product
        // Note: product.warehouseId might be the ID, product.warehouse might be the ID too depending on API
        const currentWhId = product.warehouseId || product.warehouse;
        const otherWarehouses = result.data.filter((w: Warehouse) => w.id !== currentWhId);
        setWarehouses(otherWarehouses);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    } finally {
      setIsLoadingWarehouses(false);
    }
  };

  const handleTransferClick = () => {
    if (!targetWarehouseId || quantity <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Please select a target warehouse and enter a valid quantity.',
      });
      return;
    }

    if (quantity > product.stock) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Stock',
        description: `You only have ${formatQuantity(product.stock)} units available.`,
      });
      return;
    }

    if (requireConfirmation) {
      setIsConfirmOpen(true);
    } else {
      processTransfer();
    }
  };

  const processTransfer = async () => {
    if (!targetWarehouseId || quantity <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Please select a target warehouse and enter a valid quantity.',
      });
      return;
    }

    if (quantity > product.stock) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Stock',
        description: `You only have ${formatQuantity(product.stock)} units available.`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const userSession = localStorage.getItem('mock-user-session');
      const userId = userSession ? JSON.parse(userSession).uid : 'system';
      
      const response = await fetch(getApiUrl('/inventory/transfer'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          sourceProductId: product.id,
          fromWarehouseId: product.warehouseId || product.warehouse,
          targetWarehouseId,
          quantity,
          notes,
          userId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (result.pendingApproval) {
          toast({
            title: 'Transfer Pending Approval',
            description: `Stock transfer for ${product.name} has been submitted for multi-level approval.`,
          });
        } else {
          toast({
            title: 'Transfer Successful',
            description: `${quantity} ${product.unitOfMeasure} of ${product.name} transferred successfully.`,
          });
        }
        setIsOpen(false);
        onSuccess?.();
        // Custom event for immediate updates if needed
        dispatchStockUpdate();
      } else {
        throw new Error(result.error || 'Transfer failed');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Transfer Failed',
        description: error.message || 'An error occurred during transfer.',
      });
    } finally {
      setIsSubmitting(true); // Keep submitting true until closed? No, usually reset.
      setIsSubmitting(false);
      setIsConfirmOpen(false);
    }
  };

  const targetWhName = warehouses.find(w => w.id === targetWarehouseId)?.name;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {children && <DialogTrigger asChild>{children}</DialogTrigger>}
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WarehouseIcon className="h-5 w-5 text-primary" />
              Stock Transfer
            </DialogTitle>
            <DialogDescription>
              Move <strong>{product.name}</strong> from <strong>{product.warehouseName || 'Current Warehouse'}</strong> to another location.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="bg-muted/50 p-3 rounded-md border text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Stock:</span>
                <span className="font-semibold">{formatQuantity(product.stock)} {product.unitOfMeasure}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SKU / Barcode:</span>
                <span>{product.sku || product.barcode || 'N/A'}</span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="targetWarehouse">Destination Warehouse</Label>
              <Select value={targetWarehouseId} onValueChange={setTargetWarehouseId}>
                <SelectTrigger id="targetWarehouse" className="w-full">
                  <SelectValue placeholder={isLoadingWarehouses ? "Loading warehouses..." : "Select where to move stock"} />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                  {warehouses.length === 0 && !isLoadingWarehouses && (
                    <div className="p-2 text-sm text-center text-muted-foreground">No other active warehouses found.</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="quantity">Transfer Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={product.stock}
                value={quantity || ''}
                onChange={(e) => setQuantity(Math.min(product.stock, Number(e.target.value)))}
                placeholder={`Max: ${formatQuantity(product.stock)}`}
                className="w-full"
              />
            </div>

            {quantity > 0 && targetWarehouseId && (
              <div className="flex items-center justify-center gap-3 py-2 px-4 bg-primary/5 rounded-lg border border-primary/20 animate-in fade-in zoom-in duration-300">
                <div className="text-center">
                  <div className="text-[10px] uppercase text-muted-foreground font-bold">From</div>
                  <div className="text-xs font-medium truncate max-w-[100px]">{product.warehouseName || 'Source'}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-primary" />
                <div className="text-center">
                  <div className="text-[10px] uppercase text-muted-foreground font-bold">To</div>
                  <div className="text-xs font-medium truncate max-w-[100px]">{targetWhName || 'Destination'}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-[10px] uppercase text-primary font-bold">Moving</div>
                  <div className="text-sm font-bold text-primary">{formatQuantity(quantity)}</div>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="notes">Transfer Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Seasonal restocking, store request"
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleTransferClick} 
              disabled={isSubmitting || !targetWarehouseId || quantity <= 0}
              className="gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Confirm Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Stock Transfer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move <strong>{formatQuantity(quantity)} {product.unitOfMeasure}</strong> of <strong>{product.name}</strong> to <strong>{targetWhName}</strong>?
              This action will update stock levels in both locations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={processTransfer} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Transfer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
