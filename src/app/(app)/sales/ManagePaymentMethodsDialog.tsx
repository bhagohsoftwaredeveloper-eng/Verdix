'use client';

import { useState, useEffect } from 'react';
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
import { PaymentMethod } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Pencil, Trash2, Loader2, CreditCard, AlertTriangle, FileX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function DataExistDialog({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileX className="h-5 w-5 text-destructive" />
            Data Exist
          </DialogTitle>
          <DialogDescription>
            A payment method with this name already exists. Please choose a different name.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddPaymentMethodDialog({ onSave, children }: { onSave: (name: string) => Promise<void>, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDataExistOpen, setIsDataExistOpen] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Payment method name cannot be empty.',
      });
      return;
    }
    setIsSaving(true);
    try {
      await onSave(name);
      toast({
        title: 'Payment Method Added',
        description: `Payment method "${name}" has been successfully saved.`,
      });
      setIsOpen(false);
      setName(''); // Reset for new entry
    } catch (error: any) {
      if (error.message === 'Payment method already exists') {
        setIsDataExistOpen(true);
      } else {
        console.error('Failed to save payment method', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to save payment method. Please try again.',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Payment Method</DialogTitle>
            <DialogDescription>
              Enter the name for the new payment method.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-name" className="text-right">
                Name
              </Label>
              <Input
                id="add-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Credit Card"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSaving ? 'Saving...' : 'Save Method'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DataExistDialog isOpen={isDataExistOpen} onClose={() => setIsDataExistOpen(false)} />
    </>
  );
}

function PaymentMethodDialog({ paymentMethod, onSave, children, disabled }: { paymentMethod?: PaymentMethod, onSave: (name: string) => Promise<void>, children: React.ReactNode, disabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(paymentMethod?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Payment method name cannot be empty.',
      });
      return;
    }
    setIsSaving(true);
    try {
      await onSave(name);
      toast({
        title: paymentMethod ? 'Payment Method Updated' : 'Payment Method Added',
        description: `Payment method "${name}" has been successfully saved.`,
      });
      setIsOpen(false);
      if (!paymentMethod) setName(''); // Reset for new entry
    } catch (error) {
      console.error('Failed to save payment method', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save payment method. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild disabled={disabled}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{paymentMethod ? 'Edit Payment Method' : 'Add New Payment Method'}</DialogTitle>
          <DialogDescription>
            {paymentMethod ? `Editing the payment method "${paymentMethod.name}".` : 'Enter the name for the new payment method.'}
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
              placeholder="e.g., Credit Card"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Saving...' : 'Save Method'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentMethodRow({ paymentMethod, onUpdate, onDelete, paymentMethods }: { paymentMethod: PaymentMethod, onUpdate: () => void, onDelete: () => void, paymentMethods: PaymentMethod[] }) {
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleUpdate = async (name: string) => {
    // Check if another payment method with same name already exists (excluding current one)
    const existingMethod = paymentMethods.find(method =>
      method.id !== paymentMethod.id && method.name.toLowerCase() === name.toLowerCase()
    );

    if (existingMethod) {
      toast({
        variant: 'destructive',
        title: 'Duplicate Payment Method',
        description: `A payment method with the name "${name}" already exists.`,
      });
      throw new Error('Payment method already exists');
    }

    try {
      const response = await fetch(`/api/payment-methods/${paymentMethod.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update payment method');
      }

      toast({
        title: 'Payment Method Updated',
        description: `Payment method "${name}" has been successfully updated.`,
      });
      onUpdate();
    } catch (error: any) {
      console.error('Error updating payment method:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update payment method. Please try again.',
      });
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/payment-methods/${paymentMethod.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete payment method');
      }

      toast({
        title: 'Payment Method Deleted',
        description: `Payment method "${paymentMethod.name}" has been deleted.`,
      });
      setIsDeleteDialogOpen(false);
      onDelete();
    } catch (error: any) {
      console.error("Error deleting payment method: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete payment method. It might be in use.',
      });
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{paymentMethod.name}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <PaymentMethodDialog paymentMethod={paymentMethod} onSave={handleUpdate}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          </PaymentMethodDialog>
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Confirm Deletion
                </DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete the payment method "{paymentMethod.name}"? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete Method
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

function PaymentMethodSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-5 w-48" />
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

export function ManagePaymentMethodsDialog({ trigger, onChange }: { trigger?: React.ReactNode, onChange?: () => void }) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/payment-methods?activeOnly=false');
      const result = await response.json();

      if (result.success) {
        setPaymentMethods(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch payment methods');
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load payment methods.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const handleAddMethod = async (name: string) => {
    // Check if payment method with same name already exists
    const existingMethod = paymentMethods.find(method =>
      method.name.toLowerCase() === name.toLowerCase()
    );

    if (existingMethod) {
      toast({
        variant: 'destructive',
        title: 'Duplicate Payment Method',
        description: `A payment method with the name "${name}" already exists.`,
      });
      throw new Error('Payment method already exists');
    }

    try {
      const response = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to add payment method');
      }

      await fetchPaymentMethods(); // Refresh the list
      onChange?.(); // Notify parent component
    } catch (error: any) {
      console.error('Error adding payment method:', error);
      throw error; // Re-throw to let the dialog handle the error
    }
  };

  const handleUpdate = () => {
    fetchPaymentMethods(); // Refresh the list
    onChange?.(); // Notify parent component
  };

  const handleDelete = () => {
    fetchPaymentMethods(); // Refresh the list
    onChange?.(); // Notify parent component
  };

  const dialogTrigger = trigger || (
    <Button variant="outline">
      <CreditCard className="mr-2 h-4 w-4" />
      Manage Payment Methods
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {dialogTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Payment Methods</DialogTitle>
          <DialogDescription>
            Add, edit, or delete your payment methods.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <div className="flex justify-end mb-4">
            <AddPaymentMethodDialog onSave={handleAddMethod}>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Method
              </Button>
            </AddPaymentMethodDialog>
          </div>
          <Card>
            <CardContent className='p-0'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && Array.from({ length: 4 }).map((_, i) => <PaymentMethodSkeleton key={i} />)}
                  {paymentMethods?.map((method) => (
                    <PaymentMethodRow
                      key={method.id}
                      paymentMethod={method}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                      paymentMethods={paymentMethods}
                    />
                  ))}
                  {!isLoading && paymentMethods?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center h-24">
                        No payment methods found.
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
