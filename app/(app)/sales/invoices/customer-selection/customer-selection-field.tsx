'use client';

import { Control } from 'react-hook-form';
import { Customer } from '@/lib/types';
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InlineCustomerSelect } from '@/app/(app)/components/inline-selects/inline-customer-select';

interface CustomerSelectionFieldProps {
  control: Control<any>;
  customerList: Customer[];
  name?: string;
  label?: string;
  className?: string;
  onCustomerAdded?: () => void;
  formItemClassName?: string;
  labelClassName?: string;
}

export function CustomerSelectionField({
  control,
  customerList,
  name = 'customer',
  label = 'Customer',
  className,
  onCustomerAdded,
  formItemClassName,
  labelClassName,
}: CustomerSelectionFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={formItemClassName}>
          <div className="flex items-center h-5">
            {label && <FormLabel className={labelClassName}>{label}</FormLabel>}
          </div>
          <InlineCustomerSelect
            customers={customerList ?? []}
            value={field.value}
            onChange={field.onChange}
            onListChange={() => onCustomerAdded?.()}
            placeholder="Select a customer"
            triggerClassName={className}
            itemClassName="text-xs"
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
