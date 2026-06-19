'use client';

import { Control } from 'react-hook-form';
import { Customer } from '@/lib/types';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useCustomerSelection } from './use-customer-selection';
import AddCustomerDialog from '../../customer/list/add-customer-dialog';

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
  const { showAddDialog, setShowAddDialog, handleAddCustomer } = useCustomerSelection({ onCustomerAdded });

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
                type="button"
                onClick={e => { e.preventDefault(); setShowAddDialog(true); }}
              >
                Manage
              </Button>
            </div>
            <Select
              value={field.value?.id || ''}
              onValueChange={value => {
                const customer = customerList?.find(c => c.id === value);
                field.onChange(customer);
              }}
            >
              <FormControl>
                <SelectTrigger className={className}>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {customerList?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
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
