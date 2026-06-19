'use client';

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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, PlusCircle } from 'lucide-react';
import type { Product } from '@/lib/types';

import { useAddSerialForm } from './use-add-serial-form';

export function AddSerialNumberDialog({ product }: { product: Product }) {
  const {
    isOpen,
    setIsOpen,
    isSubmitting,
    serialNumber,
    setSerialNumber,
    quantity,
    setQuantity,
    baseSerial,
    setBaseSerial,
    mode,
    setMode,
    handleAddBatchSerials,
    handleAddSingleSerial,
  } = useAddSerialForm({ product });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Serial Number
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Serial Numbers for {product.name}</DialogTitle>
          <DialogDescription>
            Add individual serial numbers or generate multiple serial numbers in batch.
          </DialogDescription>
        </DialogHeader>

        {/* Mode Selection */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={mode === 'single' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('single')}
            className="flex-1"
          >
            Single Serial
          </Button>
          <Button
            variant={mode === 'batch' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('batch')}
            className="flex-1"
          >
            Batch Serials
          </Button>
        </div>

        {/* Single Serial Mode */}
        {mode === 'single' && (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="serial" className="text-right">
                Serial Number
              </Label>
              <Input
                id="serial"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="col-span-3"
                placeholder="e.g., SN-123456789"
              />
            </div>
          </div>
        )}

        {/* Batch Serial Mode */}
        {mode === 'batch' && (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="baseSerial" className="text-right">
                Base Serial
              </Label>
              <Input
                id="baseSerial"
                value={baseSerial}
                onChange={(e) => setBaseSerial(e.target.value)}
                className="col-span-3"
                placeholder="e.g., SN-001"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="col-span-3"
                placeholder="e.g., 10"
              />
            </div>
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
              <p className="font-medium mb-1">Preview:</p>
              <p>This will generate serial numbers like:</p>
              <p className="font-mono">
                {baseSerial ? `${baseSerial}-001, ${baseSerial}-002, ..., ${baseSerial}-${String(quantity).padStart(3, '0')}` : 'Enter base serial first'}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={mode === 'single' ? handleAddSingleSerial : handleAddBatchSerials}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
              </>
            ) : mode === 'single' ? (
              'Add Serial'
            ) : (
              `Add ${quantity} Serials`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
