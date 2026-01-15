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
import { ManageCustomersDialog } from '../ManageCustomersDialog';

interface CustomerSelectionFieldProps {
  control: Control<any>;
  customerList: Customer[];
  name?: string;
  label?: string;
  className?: string;
}

export function CustomerSelectionField({
  control,
  customerList,
  name = 'customer',
  label = 'Customer',
  className
}: CustomerSelectionFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <FormLabel>{label}</FormLabel>
            <div className="ml-auto">
              <ManageCustomersDialog trigger={<Button variant="link" size="sm" type="button">Manage</Button>} />
            </div>
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
  );
}
