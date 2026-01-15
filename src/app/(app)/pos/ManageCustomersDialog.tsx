
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
import { Customer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Pencil, Trash2, Loader2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function CustomerDialog({ customer, onSave, children }: { customer?: Customer, onSave: (name: string, contactNumber: string, paymentTerms: string) => Promise<void>, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(customer?.name || '');
  const [contactNumber, setContactNumber] = useState(customer?.contactNumber || '');
  const [paymentTerms, setPaymentTerms] = useState(customer?.paymentTerms || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim() || !contactNumber.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Customer name and contact number cannot be empty.',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(name, contactNumber, paymentTerms);
      toast({
        title: customer ? 'Customer Updated (Mock)' : 'Customer Added (Mock)',
        description: `Customer "${name}" has been successfully saved.`,
      });
      setIsOpen(false);
      if (!customer) {
        setName('');
        setContactNumber('');
        setPaymentTerms('');
      }
    } catch (error) {
      console.error('Failed to save customer', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save customer. Please try again.',
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
          <DialogTitle>{customer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
          <DialogDescription>
            {customer ? `Editing the customer "${customer.name}".` : 'Enter the details for the new customer.'}
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
              placeholder="e.g., John Doe"
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim() || !contactNumber.trim()}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Saving...' : 'Save Customer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function CustomerRow({ customer, onCustomersUpdated }: { customer: Customer; onCustomersUpdated: () => void; }) {
  const { toast } = useToast();

  const handleUpdate = async (name: string, contactNumber: string, paymentTerms: string) => {
    // Mock update
    console.log('Mock update:', { id: customer.id, name, contactNumber, paymentTerms });
    onCustomersUpdated();
  };
  
  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete the customer "${customer.name}"?`)) {
      // Mock delete
      console.log('Mock delete:', customer.id);
      onCustomersUpdated();
      toast({
        title: 'Customer Deleted (Mock)',
        description: `Customer "${customer.name}" has been deleted.`,
      });
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{customer.name}</TableCell>
      <TableCell>{customer.contactNumber}</TableCell>
      <TableCell>{customer.paymentTerms}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <CustomerDialog customer={customer} onSave={handleUpdate}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          </CustomerDialog>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function CustomerSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-5 w-32" />
      </TableCell>
       <TableCell>
        <Skeleton className="h-5 w-40" />
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

export function PosManageCustomersDialog({ onCustomersUpdated }: { onCustomersUpdated: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useState(() => {
    // Simulate fetching customers
    setIsLoading(true);
    setTimeout(() => {
        setCustomers([
            { id: 'cust_1', name: 'Alice Johnson', contactNumber: '09171112233', paymentTerms: 'Net 30' },
            { id: 'cust_2', name: 'Bob Smith', contactNumber: '09182223344', paymentTerms: 'Due on receipt' },
        ]);
        setIsLoading(false);
    }, 300);
  });
  
  const refreshCustomers = () => {
      onCustomersUpdated();
      // Refetch mock data
      setIsLoading(true);
      setTimeout(() => {
        setCustomers([
            { id: 'cust_1', name: 'Alice Johnson', contactNumber: '09171112233', paymentTerms: 'Net 30' },
            { id: 'cust_2', name: 'Bob Smith', contactNumber: '09182223344', paymentTerms: 'Due on receipt' },
            { id: 'cust_new', name: 'New Customer', contactNumber: '09123456789', paymentTerms: 'COD' },
        ]);
        setIsLoading(false);
    }, 300);
  }

  const handleAddCustomer = async (name: string, contactNumber: string, paymentTerms: string) => {
    // Mock add
    console.log('Mock add:', { name, contactNumber, paymentTerms });
    refreshCustomers();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
            <Users className="mr-2 h-4 w-4" />
            Manage Customers
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage Customers</DialogTitle>
          <DialogDescription>
            Add, edit, or delete your customers.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
            <div className="flex justify-end mb-4">
                <CustomerDialog onSave={handleAddCustomer}>
                    <Button size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Customer
                    </Button>
                </CustomerDialog>
            </div>
            <Card>
                <CardContent className='p-0'>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact No.</TableHead>
                        <TableHead>Payment Terms</TableHead>
                        <TableHead>
                            <span className="sr-only">Actions</span>
                        </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({ length: 2 }).map((_, i) => <CustomerSkeleton key={i} />)}
                        {!isLoading && customers?.map((customer) => (
                          <CustomerRow key={customer.id} customer={customer} onCustomersUpdated={refreshCustomers}/>
                        ))}
                         {!isLoading && customers?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">
                                    No customers found.
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
