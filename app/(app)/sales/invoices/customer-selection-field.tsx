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
  formItemClassName?: string;
}

export function CustomerSelectionField({
  control,
  customerList,
  name = 'customer',
  label = 'Customer',
  className,
  onCustomerAdded,
  labelClassName,
  formItemClassName
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
        <FormItem className={formItemClassName}>
          <div className="flex items-center justify-between h-5">
              {label && <FormLabel className={labelClassName}>{label}</FormLabel>}
              <Button
                    variant="link"
                    className="h-auto p-0 text-xs text-primary"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowAddDialog(true);
                    }}
                    type="button"
                  >
                    Manage
                  </Button>
          </div>

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
