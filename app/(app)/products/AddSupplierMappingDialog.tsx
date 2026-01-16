'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SupplierProductMapping, Supplier } from '@/lib/types';
import { addSupplierMapping, updateSupplierMapping } from './actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ManageSuppliersDialog } from './ManageSuppliersDialog';

interface AddSupplierMappingDialogProps {
  productId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingMapping: SupplierProductMapping | null;
  suppliers: Supplier[];
  onRefreshSuppliers: () => void;
}

export function AddSupplierMappingDialog({
  productId,
  isOpen,
  onOpenChange,
  onSuccess,
  editingMapping,
  suppliers,
  onRefreshSuppliers
}: AddSupplierMappingDialogProps) {
  const { toast } = useToast();
  
  // Form states
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [leadTime, setLeadTime] = useState('');
  const [rop, setRop] = useState('');
  const [cost, setCost] = useState('');
  const [supplierSku, setSupplierSku] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form when opening
  useEffect(() => {
    if (isOpen) {
      if (editingMapping) {
        setSelectedSupplier(editingMapping.supplierId);
        setLeadTime(editingMapping.supplierLeadTime.toString());
        setRop(editingMapping.supplierSpecificRop.toString());
        setCost(editingMapping.supplierCost?.toString() || '');
        setSupplierSku(editingMapping.supplierSku || '');
        setIsPrimary(editingMapping.isPrimary);
      } else {
        // Reset defaults for new mapping
        setSelectedSupplier('');
        setLeadTime('');
        setRop('');
        setCost('');
        setSupplierSku('');
        setIsPrimary(false);
      }
    }
  }, [isOpen, editingMapping]);

  const handleSave = async () => {
    if (!selectedSupplier || !leadTime || !rop) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Supplier, Lead Time, and ROP are required.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let result;
      if (editingMapping) {
        result = await updateSupplierMapping(
          editingMapping.id,
          parseInt(leadTime),
          parseInt(rop),
          cost ? parseFloat(cost) : undefined,
          supplierSku,
          isPrimary
        );
      } else {
        result = await addSupplierMapping(
          productId,
          selectedSupplier,
          parseInt(leadTime),
          parseInt(rop),
          cost ? parseFloat(cost) : undefined,
          supplierSku,
          isPrimary
        );
      }

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        onOpenChange(false);
        onSuccess();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      }
    } catch (error) {
      console.error('Error saving mapping:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editingMapping ? 'Edit Mapping' : 'Add Supplier Mapping'}</DialogTitle>
          <DialogDescription>
            Configure supplier specific details.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="supplier">Supplier</Label>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier} disabled={!!editingMapping}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
                {!editingMapping && (
                    <div className="p-1 w-full border-t mt-1">
                      <ManageSuppliersDialog 
                          trigger={
                              <Button variant="ghost" size="sm" type="button" className="w-full justify-start font-normal h-8">
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Add New Supplier
                              </Button>
                          } 
                          onSupplierAdded={onRefreshSuppliers} 
                        />
                    </div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="leadTime">Lead Time (Days)</Label>
                <Input id="leadTime" type="number" value={leadTime} onChange={e => setLeadTime(e.target.value)} placeholder="e.g. 7" />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="rop">Reorder Point</Label>
                <Input id="rop" type="number" value={rop} onChange={e => setRop(e.target.value)} placeholder="e.g. 50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                  <Label htmlFor="cost">Cost (₱)</Label>
                  <Input id="cost" type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="e.g. 100.00" />
              </div>
              <div className="grid gap-2">
                  <Label htmlFor="supplierSku">Supplier SKU</Label>
                  <Input id="supplierSku" value={supplierSku} onChange={e => setSupplierSku(e.target.value)} placeholder="Optional" />
              </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
