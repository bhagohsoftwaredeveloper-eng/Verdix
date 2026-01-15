
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
import { Customer } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Pencil, Trash2, Loader2, Users, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCustomers } from '@/hooks/use-api';
import AddCustomerDialog from '@/app/(app)/customer/list/add-customer-dialog';

function CustomerRow({ customer, editingCustomer, onEdit, onDelete, onToggleActive, onEditSave }: {
  customer: Customer;
  editingCustomer: Customer | null;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onToggleActive: (customer: Customer) => void;
  onEditSave: (customerId: string, name: string, contactNumber: string, active: boolean, salesPerson: string, salesArea: string, salesGroup: string, loyaltyPoints: number, paymentTerms: string, address: string, billingAddress: string, discount: number, creditLimit: number, priceLevelId?: string) => Promise<void>;
}) {
  const { toast } = useToast();

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete the customer "${customer.name}"?`)) {
      try {
        await onDelete(customer);
        toast({
          title: 'Customer Deleted',
          description: `Customer "${customer.name}" has been deleted.`,
        });
      } catch (error) {
        console.error("Error deleting customer: ", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to delete customer. Please try again.',
        });
      }
    }
  };

  const handleToggleActive = async () => {
    try {
      await onToggleActive(customer);
      toast({
        title: 'Customer Updated',
        description: `Customer "${customer.name}" has been ${customer.active ? 'deactivated' : 'activated'}.`,
      });
    } catch (error) {
      console.error("Error updating customer: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update customer. Please try again.',
      });
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{customer.name}</TableCell>
      <TableCell>{customer.contactNumber}</TableCell>
      <TableCell>{customer.paymentTerms}</TableCell>
      <TableCell>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          customer.active
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
        }`}>
          {customer.active ? 'Active' : 'Inactive'}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(customer)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleActive}
            className={customer.active ? 'text-orange-600' : 'text-green-600'}
          >
            {customer.active ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {customer.active ? 'Deactivate' : 'Activate'}
          </Button>
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
       <TableCell>
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ManageCustomersDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { customers, loading, error, refetch } = useCustomers();
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleAddCustomer = async (
    customerId: string,
    name: string,
    contactNumber: string,
    active: boolean,
    salesPerson: string,
    salesArea: string,
    salesGroup: string,
    loyaltyPoints: number,
    paymentTerms: string,
    address: string,
    billingAddress: string,
    discount: number,
    creditLimit: number,
    priceLevelId?: string
  ) => {
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          name,
          contactNumber,
          active,
          salesPerson,
          salesArea,
          salesGroup,
          loyaltyPoints,
          paymentTerms,
          address,
          billingAddress,
          discount,
          creditLimit,
          priceLevelId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add customer');
      }

      refetch(); // Refresh the customers list
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  };

  const handleEditCustomer = async (
    customerId: string,
    name: string,
    contactNumber: string,
    active: boolean,
    salesPerson: string,
    salesArea: string,
    salesGroup: string,
    loyaltyPoints: number,
    paymentTerms: string,
    address: string,
    billingAddress: string,
    discount: number,
    creditLimit: number,
    priceLevelId?: string
  ) => {
    try {
      const response = await fetch(`/api/customers/${editingCustomer?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          name,
          contactNumber,
          active,
          salesPerson,
          salesArea,
          salesGroup,
          loyaltyPoints,
          paymentTerms,
          address,
          billingAddress,
          discount,
          creditLimit,
          priceLevelId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update customer');
      }

      setEditingCustomer(null);
      refetch(); // Refresh the customers list
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete customer');
      }

      refetch(); // Refresh the customers list
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  };

  const handleToggleActive = async (customer: Customer) => {
    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...customer,
          active: !customer.active,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update customer');
      }

      refetch(); // Refresh the customers list
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  };

  const dialogTrigger = trigger || (
    <Button variant="outline">
        <Users className="mr-2 h-4 w-4" />
        Manage Customers
    </Button>
  );

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Customers</DialogTitle>
            <DialogDescription>
              Add, edit, or delete your customers.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
              <div className="flex justify-end mb-4">
                  <Button size="sm" onClick={() => setShowAddDialog(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Customer
                  </Button>
              </div>
              <Card>
                  <CardContent className='p-0'>
                      <Table>
                      <TableHeader>
                          <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Contact No.</TableHead>
                          <TableHead>Payment Terms</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>
                              <span className="sr-only">Actions</span>
                          </TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {loading && Array.from({ length: 4 }).map((_, i) => <CustomerSkeleton key={i} />)}
                          {customers?.map((customer) => (
                            <CustomerRow
                              key={customer.id}
                              customer={customer}
                              editingCustomer={editingCustomer}
                              onEdit={setEditingCustomer}
                              onDelete={handleDeleteCustomer}
                              onToggleActive={handleToggleActive}
                              onEditSave={handleEditCustomer}
                            />
                          ))}
                           {!loading && customers?.length === 0 && (
                              <TableRow>
                                  <TableCell colSpan={5} className="text-center h-24">
                                      No customers found.
                                  </TableCell>
                              </TableRow>
                          )}
                          {error && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-destructive">
                                    Error loading customers: {error}
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

      {/* Add Customer Dialog */}
      <AddCustomerDialog
        onSave={handleAddCustomer}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      >
        <div />
      </AddCustomerDialog>

      {/* Edit Customer Dialog */}
      <AddCustomerDialog
        onSave={handleEditCustomer}
        open={!!editingCustomer}
        onOpenChange={(open: boolean) => !open && setEditingCustomer(null)}
        customer={editingCustomer}
      >
        <div />
      </AddCustomerDialog>
    </>
  );
}
