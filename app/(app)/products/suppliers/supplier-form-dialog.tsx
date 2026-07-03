'use client';

import { useState } from 'react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { Supplier } from '@/lib/types';

import { SupplierFormBody } from './supplier-form-body';
import type { SupplierSaveHandler } from './use-supplier-form';

/**
 * Standalone add/edit supplier drawer: its own Sheet wrapping the shared
 * `SupplierFormBody`. Used wherever a supplier can be created inline (suppliers
 * list, purchase orders, supplier mapping). The single Manage Suppliers drawer
 * embeds `SupplierFormBody` directly instead of using this wrapper.
 */
export function SupplierFormDialog({
  supplier,
  onSave,
  children,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  supplier?: Supplier;
  onSave: SupplierSaveHandler;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? setControlledOpen || (() => {}) : setInternalOpen;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{supplier ? 'Edit Supplier' : 'Add Supplier'}</SheetTitle>
          <SheetDescription className="sr-only">
            {supplier ? 'Edit the supplier details below.' : 'Fill in the supplier details below.'}
          </SheetDescription>
        </SheetHeader>
        <SupplierFormBody
          supplier={supplier}
          onSave={onSave}
          open={isOpen}
          onOpenChange={setIsOpen}
        />
      </SheetContent>
    </Sheet>
  );
}
