
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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
import { PlusCircle, Pencil, Trash2, Loader2, CreditCard, AlertTriangle, FileX, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { getApiUrl } from '@/lib/api-config';

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

export function AddPaymentMethodDialog({ onSave, children, open, onOpenChange }: { onSave: (name: string, isReferenceRequired: boolean) => Promise<void>, children: React.ReactNode, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;

  const [name, setName] = useState('');
  const [isReferenceRequired, setIsReferenceRequired] = useState(false);
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
      await onSave(name, isReferenceRequired);
      toast({
        title: 'Payment Method Added',
        description: `Payment method "${name}" has been successfully saved.`,
      });
      setIsOpen(false);
      setName(''); // Reset for new entry
      setIsReferenceRequired(false);
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-ref-req" className="text-right">
                Ref. Required
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch
                    id="add-ref-req"
                    checked={isReferenceRequired}
                    onCheckedChange={setIsReferenceRequired}
                />
                <Label htmlFor="add-ref-req" className="font-normal text-muted-foreground">
                    Require reference number input
                </Label>
              </div>
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

function PaymentMethodDialog({ paymentMethod, onSave, children, disabled }: { paymentMethod?: PaymentMethod, onSave: (name: string, isReferenceRequired: boolean) => Promise<void>, children: React.ReactNode, disabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(paymentMethod?.name || '');
  const [isReferenceRequired, setIsReferenceRequired] = useState(paymentMethod?.isReferenceRequired || false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Reset state when dialog opens or paymentMethod changes
  useEffect(() => {
    if (isOpen) {
        setName(paymentMethod?.name || '');
        setIsReferenceRequired(paymentMethod?.isReferenceRequired || false);
    }
  }, [isOpen, paymentMethod]);

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
      await onSave(name, isReferenceRequired);
      toast({
        title: paymentMethod ? 'Payment Method Updated' : 'Payment Method Added',
        description: `Payment method "${name}" has been successfully saved.`,
      });
      setIsOpen(false);
      if (!paymentMethod) {
          setName(''); // Reset for new entry
          setIsReferenceRequired(false);
      }
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ref-req" className="text-right">
                Ref. Required
            </Label>
            <div className="flex items-center space-x-2 col-span-3">
                <Switch
                    id="ref-req"
                    checked={isReferenceRequired}
                    onCheckedChange={setIsReferenceRequired}
                />
                <Label htmlFor="ref-req" className="font-normal text-muted-foreground">
                    Require reference number input
                </Label>
            </div>
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

  const handleUpdate = async (name: string, isReferenceRequired: boolean) => {
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
      const response = await fetch(getApiUrl(`/payment-methods/${paymentMethod.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, isReferenceRequired }),
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
      const response = await fetch(getApiUrl(`/payment-methods/${paymentMethod.id}`), {
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
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
            {paymentMethod.name}
            {paymentMethod.isReferenceRequired && (
                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 font-mono">
                    REF REQ
                </span>
            )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <PaymentMethodDialog paymentMethod={paymentMethod} onSave={handleUpdate}>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
          </PaymentMethodDialog>
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="icon" className="h-8 w-8">
                <Trash2 className="h-4 w-4" />
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

export function ManagePaymentMethodsDialog({ trigger, onChange, open, onOpenChange }: { trigger?: React.ReactNode, onChange?: () => void, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const { toast } = useToast();

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;

  const fetchPaymentMethods = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(getApiUrl('/payment-methods?activeOnly=false'));
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
    if (isOpen) {
      fetchPaymentMethods();
    }
  }, [isOpen]);

  const handleAddMethod = async (name: string, isReferenceRequired: boolean) => {
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
      const response = await fetch(getApiUrl('/payment-methods'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, isReferenceRequired }),
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

  const filteredPaymentMethods = paymentMethods.filter(method =>
    method.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredPaymentMethods.length / pageSize);
  const paginatedPaymentMethods = filteredPaymentMethods.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
     <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Payment Methods</DialogTitle>
          <DialogDescription>
            Add, edit, or delete your payment methods.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className="relative flex-1 max-w-xs mr-3 ml-1 mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search payment methods..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <AddPaymentMethodDialog onSave={handleAddMethod}>
                <Button size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Method
                </Button>
              </AddPaymentMethodDialog>
            </div>
            <Card className="flex-1 flex flex-col overflow-hidden">
                <CardContent className='p-0 flex-1 overflow-hidden'>
                    <ScrollArea className="h-full">
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
                            {paginatedPaymentMethods?.map((method) => (
                              <PaymentMethodRow
                                key={method.id}
                                paymentMethod={method}
                                onUpdate={handleUpdate}
                                onDelete={handleDelete}
                                paymentMethods={paymentMethods}
                              />
                            ))}
                             {!isLoading && filteredPaymentMethods?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center h-24">
                                        No payment methods found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
            {!isLoading && filteredPaymentMethods.length > 0 && (
              <div className="mt-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
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
