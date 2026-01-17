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
import { Supplier } from '../../../lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Pencil, Trash2, Loader2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getSuppliers, addSupplier, updateSupplier, deleteSupplier, getPaymentTerms } from './actions';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"


export function SupplierFormDialog({ supplier, onSave, children }: { supplier?: Supplier, onSave: (data: any) => Promise<void>, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(supplier?.name || '');
  const [telephone, setTelephone] = useState(supplier?.telephone || '');
  const [mobilePhone, setMobilePhone] = useState(supplier?.mobilePhone || '');
  const [email, setEmail] = useState(supplier?.email || '');
  const [address, setAddress] = useState(supplier?.address || '');
  const [company, setCompany] = useState(supplier?.company || '');
  const [tin, setTin] = useState(supplier?.tin || '');
  const [paymentTerms, setPaymentTerms] = useState(supplier?.paymentTerms || 'CASH');
  const [markupPercentage, setMarkupPercentage] = useState(supplier?.markupPercentage?.toString() || '0');
  
  const [availablePaymentTerms, setAvailablePaymentTerms] = useState<any[]>([]);

  React.useEffect(() => {
    const loadPaymentTerms = async () => {
      const terms = await getPaymentTerms();
      setAvailablePaymentTerms(terms);
    };
    loadPaymentTerms();
  }, []);
  
  // Keep legacy fields internally if needed, or deprecate
  // const [contactNumber, setContactNumber] = useState(supplier?.contactNumber || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Supplier name is required.',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name,
        contactNumber: mobilePhone, // Map mobile to contactNumber for legacy compatibility if strict
        telephone,
        mobilePhone,
        email,
        address,
        company,
        tin,
        paymentTerms,
        markupPercentage: parseFloat(markupPercentage) || 0,
      });
      // specific toast handling can be here or in parent, but component already has it. 
      // Keeping it here for consistency with original code.
      toast({
        title: supplier ? 'Supplier Updated' : 'Supplier Added',
        description: `Supplier "${name}" has been successfully saved.`,
      });
      setIsOpen(false);
      if (!supplier) {
        setName('');
        setTelephone('');
        setMobilePhone('');
        setEmail('');
        setAddress('');
        setCompany('');
        setTin('');
        setPaymentTerms('CASH');
        setMarkupPercentage('0');
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Supplier Name"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company Name"
                />
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor="tin">TIN</Label>
                <Input
                  id="tin"
                  value={tin}
                  onChange={(e) => setTin(e.target.value)}
                  placeholder="TIN"
                />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-2">
                <Label htmlFor="telephone">Telephone</Label>
                <Input
                  id="telephone"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="Landline"
                />
            </div>
            <div className="flex flex-col gap-2">
                <Label htmlFor="mobilePhone">Mobile Phone</Label>
                <Input
                  id="mobilePhone"
                  value={mobilePhone}
                  onChange={(e) => setMobilePhone(e.target.value)}
                  placeholder="Mobile"
                />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
             <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-2">
                    <Label htmlFor="paymentTerms">Payment Terms</Label>
                    <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                    <SelectTrigger>
                        <SelectValue placeholder="Terms" />
                    </SelectTrigger>
                    <SelectContent>
                        {availablePaymentTerms.length > 0 ? (
                            availablePaymentTerms.map((term) => (
                                <SelectItem key={term.id} value={term.name}>
                                    {term.name}
                                </SelectItem>
                            ))
                        ) : (
                             // Fallback if no terms found or loading
                             <>
                                <SelectItem value="CASH">CASH</SelectItem>
                                <SelectItem value="7 Days">7 Days</SelectItem>
                                <SelectItem value="15 Days">15 Days</SelectItem>
                                <SelectItem value="30 Days">30 Days</SelectItem>
                                <SelectItem value="60 Days">60 Days</SelectItem>
                             </>
                        )}
                    </SelectContent>
                    </Select>
                </div>
                 <div className="flex flex-col gap-2">
                    <Label htmlFor="markupPercentage">Markup (%)</Label>
                    <Input
                    id="markupPercentage"
                    type="number"
                    value={markupPercentage}
                    onChange={(e) => setMarkupPercentage(e.target.value)}
                    placeholder="0"
                    />
                </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="resize-none"
              rows={3}
              placeholder="Full Address"
            />
          </div>

        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Saving...' : 'Save Supplier'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function SupplierRow({ supplier, onUpdateSupplier, onDeleteSupplier }: { supplier: Supplier, onUpdateSupplier: (data: any) => void, onDeleteSupplier: () => void }) {
  const { toast } = useToast();

  const handleUpdate = async (data: any) => {
    onUpdateSupplier(data);
    toast({
      title: 'Supplier Updated',
      description: `Supplier "${data.name}" has been successfully updated.`,
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
      <TableCell>{supplier.company || '-'}</TableCell>
      <TableCell>{supplier.tin || '-'}</TableCell>
      <TableCell>{supplier.address || '-'}</TableCell>
      <TableCell>{supplier.contactNumber || supplier.mobilePhone}</TableCell>
      <TableCell>{supplier.paymentTerms || '-'}</TableCell>
      <TableCell>{supplier.markupPercentage ? `${supplier.markupPercentage}%` : '0%'}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <SupplierFormDialog supplier={supplier} onSave={handleUpdate}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          </SupplierFormDialog>
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
        <Skeleton className="h-5 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-24" />
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
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ManageSuppliersDialog({ 
  trigger, 
  onSupplierAdded,
  open,
  onOpenChange
}: { 
  trigger?: React.ReactNode; 
  onSupplierAdded?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
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

  const handleAddSupplier = async (data: any) => {
    const result = await addSupplier(data);
    if (result.success) {
      await loadSuppliers();
      if (onSupplierAdded) {
        onSupplierAdded();
      }
    }
  };

  const handleUpdateSupplier = async (supplierId: string, data: any) => {
    const result = await updateSupplier(supplierId, data);
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
    if (open) {
      loadSuppliers();
    }
  }, [open]);

  // Initial load if generic usage
  React.useEffect(() => {
    loadSuppliers();
  }, []);

  const dialogTrigger = trigger || (
    <Button variant="outline">
        <Users className="mr-2 h-4 w-4" />
        Manage Suppliers
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {dialogTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage Suppliers</DialogTitle>
          <DialogDescription>
            Add, edit, or delete your product suppliers.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
            <div className="flex justify-end mb-4">
                <SupplierFormDialog onSave={handleAddSupplier}>
                    <Button size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Supplier
                    </Button>
                </SupplierFormDialog>
            </div>
            <Card>
                <CardContent className='p-0'>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>TIN</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Contact No.</TableHead>
                        <TableHead>Payment Terms</TableHead>
                        <TableHead>Markup</TableHead>
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
                              onUpdateSupplier={(data) => handleUpdateSupplier(supplier.id, data)}
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
