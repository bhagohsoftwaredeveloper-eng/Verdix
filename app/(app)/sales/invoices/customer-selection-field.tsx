'use client';

import { Control } from 'react-hook-form';
import { Customer } from '@/lib/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import AddCustomerDialog from '../../customer/list/add-customer-dialog';

interface CustomerSelectionFieldProps {
  control: Control<any>;
  customerList: Customer[];
  name?: string;
  label?: string;
  className?: string;
  onCustomerAdded?: () => void;
}

export function CustomerSelectionField({
  control,
  customerList,
  name = 'customer',
  label = 'Customer',
  className,
  onCustomerAdded,
  labelClassName
}: CustomerSelectionFieldProps & { labelClassName?: string }) {
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

      if (onCustomerAdded) {
        onCustomerAdded();
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  };
  return (
    <>
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel className={labelClassName}>{label}</FormLabel>}

          <Select onValueChange={(value) => {
              const customer = customerList?.find(c => c.id === value);
              field.onChange(customer);
          }}
          value={field.value?.id || ''}
          >
            <FormControl>
              <SelectTrigger className={className}>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
               <div className="p-2 border-b sticky top-0 bg-popover z-10">
                  <Button
                    variant="secondary"
                    className="w-full justify-start h-8 px-2 text-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowAddDialog(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Customer
                  </Button>
               </div>
               {customerList?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <FormMessage />

        </FormItem>
      )}
    />
    <AddCustomerDialog
        onSave={handleAddCustomer}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      >
        <div />
      </AddCustomerDialog>
    </>
  );
}
