'use client';

import { useState, useEffect } from 'react';
import { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Scissors, Package, ArrowRight } from 'lucide-react';
import { breakPack, getChildProducts } from './actions';

export function BreakPackDialog({ parentProduct, onPackBroken, trigger }: { 
  parentProduct: Product, 
  onPackBroken: () => void, 
  trigger?: React.ReactNode 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<Product[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [quantityToBreak, setQuantityToBreak] = useState('1');
  const [isBreaking, setIsBreaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch children independently when dialog opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getChildProducts(parentProduct.id).then(data => {
        setChildren(data);
        if (data.length > 0) {
          setSelectedChildId(data[0].id);
        }
      }).finally(() => {
        setIsLoading(false);
      });
    }
  }, [isOpen, parentProduct.id]);

  const selectedChild = children.find(c => c.id === selectedChildId);
  const factor = selectedChild?.conversionFactor || 0;
  const resultQuantity = (parseFloat(quantityToBreak) || 0) * factor;

  const handleBreak = async () => {
    if (!selectedChildId || !quantityToBreak || parseFloat(quantityToBreak) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a child product and enter a valid quantity.',
      });
      return;
    }

    const qty = parseFloat(quantityToBreak);
    if (qty > parentProduct.stock) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Stock',
        description: `You only have ${parentProduct.stock} ${parentProduct.unitOfMeasure} available.`,
      });
      return;
    }

    setIsBreaking(true);
    try {
      const result = await breakPack(parentProduct.id, selectedChildId, qty);
      if (result.success) {
        toast({
          title: 'Pack Broken Successfully',
          description: result.message,
        });
        onPackBroken();
        setIsOpen(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error breaking pack',
          description: result.message,
        });
      }
    } catch (error) {
      console.error('Error in breakPack:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to break pack. Please try again.',
      });
    } finally {
      setIsBreaking(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
          <Button variant="outline" className="gap-2">
            <Scissors className="h-4 w-4" />
            Break Pack
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            Break Pack
          </DialogTitle>
          <DialogDescription>
            Convert {parentProduct.name} into smaller units.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Parent Unit</Label>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border/50">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">{parentProduct.name}</p>
                <p className="text-xs text-muted-foreground">Available: {parentProduct.stock} {parentProduct.unitOfMeasure}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="childSelect">Break into Unit</Label>
            <Select value={selectedChildId} onValueChange={setSelectedChildId}>
              <SelectTrigger id="childSelect">
                <SelectValue placeholder="Select unit to break into" />
              </SelectTrigger>
              <SelectContent>
                {children.map(child => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.name} ({child.unitOfMeasure})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qtyToBreak">Qty of {parentProduct.unitOfMeasure}</Label>
              <Input
                id="qtyToBreak"
                type="number"
                min="0.01"
                step="any"
                value={quantityToBreak}
                onChange={(e) => setQuantityToBreak(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Resulting Units</Label>
              <div className="h-10 flex items-center px-3 bg-primary/5 border border-primary/20 rounded-md font-bold text-primary">
                {resultQuantity} {selectedChild?.unitOfMeasure}
              </div>
            </div>
          </div>

          <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 flex items-center justify-between text-sm">
            <span className="text-muted-foreground italic">Conversion Factor:</span>
            <span className="font-semibold">1 {parentProduct.unitOfMeasure} = {factor} {selectedChild?.unitOfMeasure}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isBreaking}>
            Cancel
          </Button>
          <Button onClick={handleBreak} disabled={isBreaking || children.length === 0} className="gap-2">
            {isBreaking ? 'Processing...' : 'Confirm Break'}
            {!isBreaking && <ArrowRight className="h-4 w-4" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
