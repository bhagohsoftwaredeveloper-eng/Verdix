'use client';

import { useState } from 'react';
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
import {
  useCollection,
  useFirestore,
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { Supplier } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Pencil, Trash2, Loader2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function SupplierDialog({ supplier, onSave, children }: { supplier?: Supplier, onSave: (name: string, contactNumber: string) => Promise<void>, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(supplier?.name || '');
  const [contactNumber, setContactNumber] = useState(supplier?.contactNumber || '');
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
      await onSave(name, contactNumber);
      toast({
        title: supplier ? 'Supplier Updated' : 'Supplier Added',
        description: `Supplier "${name}" has been successfully saved.`,
      });
      setIsOpen(false);
      if (!supplier) {
        setName('');
        setContactNumber('');
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
              placeholder="e.g., Tech Supplies Inc."
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


function SupplierRow({ supplier }: { supplier: Supplier }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleUpdate = async (name: string, contactNumber: string) => {
    if (!firestore) return;
    const supplierRef = doc(firestore, 'suppliers', supplier.id);
    await updateDocumentNonBlocking(supplierRef, { name, contactNumber });
  };
  
  const handleDelete = async () => {
    if (!firestore) return;
    if (confirm(`Are you sure you want to delete the supplier "${supplier.name}"?`)) {
      try {
        const supplierRef = doc(firestore, 'suppliers', supplier.id);
        await deleteDocumentNonBlocking(supplierRef);
        toast({
          title: 'Supplier Deleted',
          description: `Supplier "${supplier.name}" has been deleted.`,
        });
      } catch (error) {
        console.error("Error deleting supplier: ", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to delete supplier. Please try again.',
        });
      }
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{supplier.name}</TableCell>
      <TableCell>{supplier.contactNumber}</TableCell>
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
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ManageSuppliersDialog() {
  const firestore = useFirestore();
  const suppliersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'suppliers') : null),
    [firestore]
  );
  const { data: suppliers, isLoading } = useCollection<Supplier>(suppliersCollection);

  const handleAddSupplier = async (name: string, contactNumber: string) => {
    if (!firestore) return;
    const suppliersRef = collection(firestore, 'suppliers');
    await addDocumentNonBlocking(suppliersRef, { name, contactNumber });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
            <Users className="mr-2 h-4 w-4" />
            Manage Suppliers
        </Button>
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
                        <TableHead>Contact No.</TableHead>
                        <TableHead>
                            <span className="sr-only">Actions</span>
                        </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({ length: 4 }).map((_, i) => <SupplierSkeleton key={i} />)}
                        {suppliers?.map((supplier) => (
                        <SupplierRow key={supplier.id} supplier={supplier} />
                        ))}
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
