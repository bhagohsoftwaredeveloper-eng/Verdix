'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { PlusCircle, Trash2, Star, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SupplierProductMapping, Supplier } from '@/lib/types';
import { getSupplierMappings, addSupplierMapping, updateSupplierMapping, deleteSupplierMapping, setPrimarySupplier, getSuppliers } from './actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function ProductSuppliers({ productId, onUpdate }: { productId: string, onUpdate?: () => void }) {
  const [mappings, setMappings] = useState<SupplierProductMapping[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<SupplierProductMapping | null>(null);
  const [confirmPrimaryOpen, setConfirmPrimaryOpen] = useState(false);
  const [pendingPrimaryId, setPendingPrimaryId] = useState<string | null>(null);
  const { toast } = useToast();

  // Form states
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [leadTime, setLeadTime] = useState('');
  const [rop, setRop] = useState('');
  const [cost, setCost] = useState('');
  const [supplierSku, setSupplierSku] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [mappingsData, suppliersData] = await Promise.all([
        getSupplierMappings(productId),
        getSuppliers()
      ]);
      setMappings(mappingsData);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Failed to load supplier data', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load supplier data.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [productId]);

  const handleOpenDialog = (mapping?: SupplierProductMapping) => {
    if (mapping) {
      setEditingMapping(mapping);
      setSelectedSupplier(mapping.supplierId);
      setLeadTime(mapping.supplierLeadTime.toString());
      setRop(mapping.supplierSpecificRop.toString());
      setCost(mapping.supplierCost?.toString() || '');
      setSupplierSku(mapping.supplierSku || '');
      setIsPrimary(mapping.isPrimary);
    } else {
      setEditingMapping(null);
      setSelectedSupplier('');
      setLeadTime('');
      setRop('');
      setCost('');
      setSupplierSku('');
      setIsPrimary(false);
    }
    setIsDialogOpen(true);
  };

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
        setIsDialogOpen(false);
        loadData();
        onUpdate?.();
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

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this supplier mapping?')) {
      try {
        const result = await deleteSupplierMapping(id);
        if (result.success) {
          toast({
            title: 'Removed',
            description: result.message,
          });
          loadData();
          onUpdate?.();
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: result.message,
          });
        }
      } catch (error) {
        console.error('Error deleting mapping:', error);
      }
    }
  };

  const initiateSetPrimary = (id: string) => {
    const mapping = mappings.find(m => m.id === id);
    if (!mapping) return;

    // Check if there is already a primary supplier and if values are different
    const currentPrimary = mappings.find(m => m.isPrimary);
    
    // If no current primary, or just switching, we should still warn if it looks significant, 
    // but the requirement is "User Prompt for Supplier Change Re-validation"
    // So we just always prompt to be safe and ensure they checked the ROP/Lead Time.
    setPendingPrimaryId(id);
    setConfirmPrimaryOpen(true);
  };

  const confirmSetPrimary = async () => {
    if (!pendingPrimaryId) return;
    
    try {
      const result = await setPrimarySupplier(productId, pendingPrimaryId);
      if (result.success) {
        toast({
          title: 'Primary Supplier Updated',
          description: 'The primary supplier and active ROP have been updated.',
        });
        loadData();
        onUpdate?.();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      }
    } catch (error) {
      console.error('Error setting primary:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update primary supplier.',
      });
    } finally {
      setConfirmPrimaryOpen(false);
      setPendingPrimaryId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Supplier Mappings</h3>
          <p className="text-sm text-muted-foreground">
            Manage suppliers, lead times, and reorder points for this product.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} size="sm" type="button">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Lead Time (Days)</TableHead>
              <TableHead>ROP</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : mappings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No suppliers mapped yet.
                </TableCell>
              </TableRow>
            ) : (
              mappings.map((mapping) => (
                <TableRow key={mapping.id} className={mapping.isPrimary ? 'bg-muted/30' : ''}>
                  <TableCell>
                    {mapping.isPrimary ? (
                      <TooltipProvider>
                         <Tooltip>
                            <TooltipTrigger>
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            </TooltipTrigger>
                            <TooltipContent>Primary Supplier</TooltipContent>
                         </Tooltip>
                      </TooltipProvider>
                    ) : (
                       <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-20 hover:opacity-100" onClick={() => initiateSetPrimary(mapping.id)} type="button">
                           <Star className="h-4 w-4" />
                       </Button>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {mapping.supplierName}
                    {mapping.isPrimary && <Badge variant="secondary" className="ml-2 text-xs">Primary</Badge>}
                  </TableCell>
                  <TableCell>{mapping.supplierSku || '-'}</TableCell>
                  <TableCell>{mapping.supplierLeadTime} days</TableCell>
                  <TableCell>{mapping.supplierSpecificRop}</TableCell>
                  <TableCell className="text-right">₱{mapping.supplierCost?.toFixed(2) || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(mapping)} type="button">
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(mapping.id)} type="button">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
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
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmPrimaryOpen} onOpenChange={setConfirmPrimaryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Primary Supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              Changing the primary supplier will update the effective Reorder Point (ROP) for this product based on the new supplier's lead time and ROP settings.
              <br /><br />
              Please confirm that you have validated the ROP and Lead Time for this supplier.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSetPrimary}>Confirm Change</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
