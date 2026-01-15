'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Customer } from '@/lib/types';
import { PlusCircle } from 'lucide-react';
import CustomerList from './list/customer-list';
import AddCustomerDialog from './list/add-customer-dialog';
import { useToast } from '@/hooks/use-toast';

export default function CustomerListPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      const result = await response.json();
      if (result.success) {
        setCustomers(result.data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load customers',
        });
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load customers',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleAddCustomer = async (customerId: string, name: string, contactNumber: string, active: boolean, salesPerson: string, salesArea: string, salesGroup: string, loyaltyPoints: number, paymentTerms: string, address: string, billingAddress: string, discount: number, creditLimit: number) => {
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
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Customer added successfully',
        });
        fetchCustomers(); // Refresh the list
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to add customer',
        });
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add customer',
      });
    }
  };

  const handleUpdateCustomer = async (customerId: string, values: { name: string; contactNumber: string; active: boolean; salesPerson?: string; salesArea?: string; salesGroup?: string; loyaltyPoints: number; paymentTerms?: string; address?: string; billingAddress?: string; discount: number; creditLimit: number }) => {
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Customer updated successfully',
        });
        fetchCustomers(); // Refresh the list
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to update customer',
        });
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update customer',
      });
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Customer deleted successfully',
        });
        fetchCustomers(); // Refresh the list
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to delete customer',
        });
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete customer',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer List</h1>
          <p className="text-muted-foreground">
            Manage your customers and their information.
          </p>
        </div>
        <AddCustomerDialog onSave={handleAddCustomer}>
          <Button size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </AddCustomerDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <CardDescription>
            A list of all your customers including their contact information and payment terms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomerList
            customers={customers}
            isLoading={isLoading}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
          />
        </CardContent>
      </Card>
    </div>
  );
}
