'use client';

import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ManageWarehousesDialog } from '../../ManageWarehousesDialog';
import { ManagePaymentMethodsDialog } from '../../ManagePaymentMethodsDialog';
import { CustomerSelectionField } from '../customer-selection/customer-selection-field';
import type { SalesInvoiceFormValues } from './add-invoice-types';
import type { Customer, PaymentMethod, Warehouse } from '@/lib/types';

type Props = {
  form: UseFormReturn<SalesInvoiceFormValues>;
  customers: Customer[];
  refetchCustomers: () => void;
  warehouses: Warehouse[];
  paymentMethods: PaymentMethod[];
  isReferenceRequired: boolean;
  showWarehouseDialog: boolean;
  setShowWarehouseDialog: (v: boolean) => void;
  showPaymentMethodDialog: boolean;
  setShowPaymentMethodDialog: (v: boolean) => void;
  fetchWarehouses: () => void;
  fetchPaymentMethods: () => void;
};

export function AddInvoiceFormHeader({
  form, customers, refetchCustomers,
  warehouses, paymentMethods, isReferenceRequired,
  showWarehouseDialog, setShowWarehouseDialog,
  showPaymentMethodDialog, setShowPaymentMethodDialog,
  fetchWarehouses, fetchPaymentMethods,
}: Props) {
  return (
    <div className="bg-background border-b p-4 grid grid-cols-4 gap-4 shrink-0">

      {/* Column 1: Customer & Address */}
      <div className="space-y-3">
        <CustomerSelectionField
          control={form.control}
          customerList={customers}
          className="bg-white h-8 text-xs"
          formItemClassName="space-y-1"
          onCustomerAdded={refetchCustomers}
          labelClassName="text-xs font-semibold text-muted-foreground"
        />
        <FormField
          control={form.control}
          name="deliveryAddress"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <div className="flex items-center justify-between h-5">
                <FormLabel className="text-xs font-semibold text-muted-foreground">Address</FormLabel>
              </div>
              <FormControl>
                <Input className="h-8 bg-white text-xs" placeholder="Deliver to..." {...field} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {/* Column 2: Dates & Warehouse */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <FormField
            control={form.control}
            name="invoiceDate"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <div className="flex items-center justify-between h-5">
                  <FormLabel className="text-xs font-semibold text-muted-foreground">Invoice Date</FormLabel>
                </div>
                <FormControl><Input type="date" className="h-8 bg-white text-xs" {...field} /></FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <div className="flex items-center justify-between h-5">
                  <FormLabel className="text-xs font-semibold text-muted-foreground">Due Date</FormLabel>
                </div>
                <FormControl><Input type="date" className="h-8 bg-white text-xs" {...field} /></FormControl>
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="warehouse"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <div className="flex justify-between items-center w-full h-5">
                <FormLabel className="text-xs font-semibold text-muted-foreground">Warehouse</FormLabel>
                <Button variant="link" className="h-auto p-0 text-xs text-primary" type="button" onClick={e => { e.preventDefault(); setShowWarehouseDialog(true); }}>
                  Manage
                </Button>
              </div>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-8 bg-white text-xs"><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {warehouses.map(w => <SelectItem key={w.id} value={w.id.toString()} className="text-xs">{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <ManageWarehousesDialog open={showWarehouseDialog} onOpenChange={setShowWarehouseDialog} onChange={fetchWarehouses} />
            </FormItem>
          )}
        />
      </div>

      {/* Column 3: Payment & Shipping */}
      <div className="space-y-3">
        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <div className="flex justify-between items-center w-full h-5">
                <FormLabel className="text-xs font-semibold text-muted-foreground">Payment Method</FormLabel>
                <Button variant="link" className="h-auto p-0 text-xs text-primary" type="button" onClick={e => { e.preventDefault(); setShowPaymentMethodDialog(true); }}>
                  Manage
                </Button>
              </div>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="h-8 bg-white text-xs"><SelectValue placeholder="Select method" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {paymentMethods.map(m => <SelectItem key={m.id} value={m.name} className="text-xs">{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <ManagePaymentMethodsDialog open={showPaymentMethodDialog} onOpenChange={setShowPaymentMethodDialog} onChange={fetchPaymentMethods} />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="shipping"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <div className="flex items-center justify-between h-5">
                <FormLabel className="text-xs font-semibold text-muted-foreground">Shipping</FormLabel>
              </div>
              <FormControl><Input type="number" step="0.01" className="h-8 bg-white text-xs" {...field} /></FormControl>
            </FormItem>
          )}
        />
      </div>

      {/* Column 4: Reference & Notes */}
      <div className="space-y-3">
        <FormField
          control={form.control}
          name="paymentReference"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <div className="flex items-center justify-between h-5">
                <FormLabel className="text-xs font-semibold text-muted-foreground">
                  Reference {isReferenceRequired && <span className="text-destructive">*</span>}
                </FormLabel>
              </div>
              <FormControl>
                <Input
                  className="h-8 bg-white text-xs"
                  placeholder={isReferenceRequired ? 'Reference required...' : 'Optional reference...'}
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <div className="flex items-center justify-between h-5">
                <FormLabel className="text-xs font-semibold text-muted-foreground">Notes</FormLabel>
              </div>
              <FormControl>
                <Input className="h-8 bg-white text-xs" placeholder="Brief notes..." {...field} value={field.value || ''} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

    </div>
  );
}
