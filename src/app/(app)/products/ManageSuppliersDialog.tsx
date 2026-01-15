'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Supplier } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Pencil, Trash2, Loader2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getSuppliers, addSupplier, updateSupplier, deleteSupplier } from './actions';

function SupplierDialog({ supplier, onSave, children }: { supplier?: Supplier, onSave: (name: string, contactNumber: string, address?: string, paymentTerms?: string, markupPercentage?: number) => Promise<void>, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(supplier?.name || '');
  const [contactNumber, setContactNumber] = useState(supplier?.contactNumber || '');
  const [address, setAddress] = useState(supplier?.address || '');
  const [paymentTerms, setPaymentTerms] = useState(supplier?.paymentTerms || '');
  const [markupPercentage, setMarkupPercentage] = useState(supplier?.markupPercentage?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim() || !contactNumber.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Supplier name and contact number cannot be empty.',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(name, contactNumber, address, paymentTerms, markupPercentage ? parseFloat(markupPercentage) : undefined);
      toast({
        title: supplier ? 'Supplier Updated' : 'Supplier Added',
        description: `Supplier "${name}" has been successfully saved.`,
      });
      setIsOpen(false);
      if (!supplier) {
        setName('');
        setContactNumber('');
        setAddress('');
        setPaymentTerms('');
        setMarkupPercentage('');
      }
    } catch (error) {
      console.error('Failed to save supplier', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save supplier. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
          <DialogDescription>
            {supplier ? `Editing the supplier "${supplier.name}".` : 'Enter the details for the new supplier.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., ABC Suppliers Inc."
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">
              Address
            </Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="col-span-3"
              placeholder="e.g., 123 Main St, City"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contactNumber" className="text-right">
              Contact No.
            </Label>
            <Input
              id="contactNumber"
              type="tel"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              className="col-span-3"
              placeholder="e.g., 09171234567"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="paymentTerms" className="text-right">
              Payment Terms
            </Label>
            <Input
              id="paymentTerms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Net 30"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="markupPercentage" className="text-right">
              Markup %
            </Label>
            <Input
              id="markupPercentage"
              type="number"
              value={markupPercentage}
              onChange={(e) => setMarkupPercentage(e.target.value)}
              className="col-span-3"
              placeholder="e.g., 20"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim() || !contactNumber.trim()}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Saving...' : 'Save Supplier'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function SupplierRow({ supplier, onUpdateSupplier, onDeleteSupplier }: { supplier: Supplier, onUpdateSupplier: (name: string, contactNumber: string, address?: string, paymentTerms?: string, markupPercentage?: number) => void, onDeleteSupplier: () => void }) {
  const { toast } = useToast();

  const handleUpdate = async (name: string, contactNumber: string, address?: string, paymentTerms?: string, markupPercentage?: number) => {
    onUpdateSupplier(name, contactNumber, address, paymentTerms, markupPercentage);
    toast({
      title: 'Supplier Updated',
      description: `Supplier "${name}" has been successfully updated.`,
    });
  };

  const handleDelete = () => {
    onDeleteSupplier();
    toast({
      title: 'Supplier Deleted',
      description: `Supplier "${supplier.name}" has been deleted.`,
    });
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{supplier.name}</TableCell>
      <TableCell>{supplier.address || '-'}</TableCell>
      <TableCell>{supplier.contactNumber}</TableCell>
      <TableCell>{supplier.paymentTerms || '-'}</TableCell>
      <TableCell>{supplier.markupPercentage ? `${supplier.markupPercentage}%` : '-'}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <SupplierDialog supplier={supplier} onSave={handleUpdate}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          </SupplierDialog>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function SupplierSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-5 w-48" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-64" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ManageSuppliersDialog({ trigger, onSupplierAdded }: { trigger?: React.ReactNode; onSupplierAdded?: () => void }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSuppliers = async () => {
    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSupplier = async (name: string, contactNumber: string, address?: string, paymentTerms?: string, markupPercentage?: number) => {
    const result = await addSupplier(name, contactNumber, address, paymentTerms, markupPercentage);
    if (result.success) {
      await loadSuppliers();
      if (onSupplierAdded) {
        onSupplierAdded();
      }
    }
  };

  const handleUpdateSupplier = async (supplierId: string, name: string, contactNumber: string, address?: string, paymentTerms?: string, markupPercentage?: number) => {
    const result = await updateSupplier(supplierId, name, contactNumber, address, paymentTerms, markupPercentage);
    if (result.success) {
      await loadSuppliers();
      if (onSupplierAdded) {
        onSupplierAdded();
      }
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      const result = await deleteSupplier(supplierId);
      if (result.success) {
        await loadSuppliers();
        if (onSupplierAdded) {
          onSupplierAdded();
        }
      }
    }
  };

  // Load suppliers when dialog opens
  React.useEffect(() => {
    loadSuppliers();
  }, []);

  const dialogTrigger = trigger || (
    <Button variant="outline" size="sm">
      <Users className="mr-2 h-4 w-4" />
      Manage Suppliers
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {dialogTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Suppliers</DialogTitle>
          <DialogDescription>
            Add, edit, or delete your product suppliers.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <div className="flex justify-end mb-4">
            <SupplierDialog onSave={handleAddSupplier}>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Supplier
              </Button>
            </SupplierDialog>
          </div>
          <Card>
            <CardContent className='p-0'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Contact No.</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead>Markup %</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <SupplierSkeleton key={i} />
                    ))
                  ) : suppliers.length > 0 ? (
                    suppliers.map((supplier) => (
                      <SupplierRow
                        key={supplier.id}
                        supplier={supplier}
                        onUpdateSupplier={(name, contactNumber, address, paymentTerms, markupPercentage) => handleUpdateSupplier(supplier.id, name, contactNumber, address, paymentTerms, markupPercentage)}
                        onDeleteSupplier={() => handleDeleteSupplier(supplier.id)}
                      />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No suppliers found. Add your first supplier above.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <DialogFooter>
          <DialogTrigger asChild>
            <Button variant="outline">Close</Button>
          </DialogTrigger>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
