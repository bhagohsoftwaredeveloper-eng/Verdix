'use client';

import { useMemo, useState } from 'react';
import type { Product } from '@/lib/types';
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
import { GitBranch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { reassignParent } from '../actions';
import { getIllegalReassignTargets, type TreeProduct } from '@/lib/product-tree';

const DETACH_VALUE = '__detach__';

export function ReassignParentDialog({
  product,
  products,
  onProductUpdated,
  trigger,
}: {
  product: Product;
  products: Product[];
  onProductUpdated?: () => void;
  trigger?: React.ReactNode;
}) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [targetId, setTargetId] = useState<string>('');
  const [factor, setFactor] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Legal targets = every product except the child itself and its descendants.
  const legalTargets = useMemo(() => {
    const treeProducts: TreeProduct[] = products.map((p) => ({ id: p.id, parentId: p.parentId }));
    const illegal = getIllegalReassignTargets(product.id, treeProducts);
    return products
      .filter((p) => !illegal.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, product.id]);

  const isDetach = targetId === DETACH_VALUE;
  const canSave = targetId !== '' && (isDetach || (Number(factor) > 0));

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      const newParentId = isDetach ? null : targetId;
      const result = await reassignParent(product.id, newParentId, isDetach ? 0 : Number(factor));
      if (result.success) {
        toast({ title: 'Reassigned', description: result.message });
        setIsOpen(false);
        setTargetId('');
        setFactor('');
        onProductUpdated?.();
      } else {
        toast({ variant: 'destructive', title: 'Reassignment failed', description: result.message });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Reassign Parent
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reassign Parent</DialogTitle>
          <DialogDescription>
            Move <span className="font-medium">{product.name}</span> under a different mother product,
            or detach it to become a top-level product.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="reassign-target">New parent</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger id="reassign-target">
                <SelectValue placeholder="Select a new parent product" />
              </SelectTrigger>
              <SelectContent>
                {product.parentId && (
                  <SelectItem value={DETACH_VALUE}>Detach (no parent)</SelectItem>
                )}
                {legalTargets.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isDetach && targetId !== '' && (
            <div className="space-y-2">
              <Label htmlFor="reassign-factor">
                Conversion factor ({product.unitOfMeasure} per 1 parent unit)
              </Label>
              <Input
                id="reassign-factor"
                type="number"
                step="0.0001"
                min="0"
                value={factor}
                onChange={(e) => setFactor(e.target.value)}
                placeholder="e.g., 12"
              />
              <p className="text-xs text-muted-foreground">
                How many {product.unitOfMeasure} equal one unit of the new parent.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave || isSaving}>
            {isSaving ? 'Saving...' : 'Reassign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
