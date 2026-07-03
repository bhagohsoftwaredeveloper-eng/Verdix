'use client';

import { useState } from 'react';
import { ArrowLeft, PlusCircle, Users } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import type { Supplier } from '@/lib/types';

import { SupplierFormBody } from './supplier-form-body';
import { SupplierRow } from './supplier-row';
import { SupplierSkeleton } from './supplier-skeleton';
import { useManageSuppliers } from './use-manage-suppliers';

export { SupplierFormDialog } from './supplier-form-dialog';

export function ManageSuppliersDialog({
  trigger,
  onSupplierAdded,
  open,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  onSupplierAdded?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;

  const [view, setView] = useState<'list' | 'form'>('list');
  const [editing, setEditing] = useState<Supplier | null>(null);

  const { suppliers, isLoading, handleAddSupplier, handleUpdateSupplier, handleDeleteSupplier } =
    useManageSuppliers({ isOpen, onSupplierAdded });

  const showTrigger = trigger !== null;
  const sheetTrigger = trigger || (
    <Button variant="outline">
      <Users className="mr-2 h-4 w-4" />
      Manage Suppliers
    </Button>
  );

  const handleSheetOpenChange = (next: boolean) => {
    setIsOpen(next);
    if (!next) {
      // Always fall back to the list view when the drawer closes.
      setView('list');
      setEditing(null);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setView('form');
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setView('form');
  };

  const backToList = () => {
    setView('list');
    setEditing(null);
  };

  const handleSave = editing
    ? (data: any) => handleUpdateSupplier(editing.id, data)
    : handleAddSupplier;

  return (
    <Sheet open={isOpen} onOpenChange={handleSheetOpenChange}>
      {showTrigger && <SheetTrigger asChild>{sheetTrigger}</SheetTrigger>}
      <SheetContent side="right" className="w-full sm:max-w-4xl flex flex-col gap-0 p-0">
        {view === 'list' ? (
          <>
            <SheetHeader className="px-6 py-4 border-b">
              <SheetTitle>Manage Suppliers</SheetTitle>
              <SheetDescription>
                Add, edit, or delete your product suppliers.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex justify-end mb-4">
                <Button size="sm" onClick={openAdd}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Supplier
                </Button>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>TIN</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Contact No.</TableHead>
                        <TableHead>Payment Terms</TableHead>
                        <TableHead>
                          <span className="sr-only">Actions</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <SupplierSkeleton key={i} />
                        ))
                      ) : suppliers.length > 0 ? (
                        suppliers.map((supplier) => (
                          <SupplierRow
                            key={supplier.id}
                            supplier={supplier}
                            onEdit={openEdit}
                            onDeleteSupplier={() => handleDeleteSupplier(supplier.id)}
                          />
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No suppliers found. Add your first supplier above.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={backToList}
                  className="h-8 w-8 -ml-2"
                  aria-label="Back to suppliers"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <SheetTitle>{editing ? 'Edit Supplier' : 'Add Supplier'}</SheetTitle>
              </div>
              <SheetDescription className="sr-only">
                {editing ? 'Edit the supplier details below.' : 'Fill in the supplier details below.'}
              </SheetDescription>
            </SheetHeader>
            <SupplierFormBody
              key={editing?.id ?? 'new'}
              supplier={editing ?? undefined}
              onSave={handleSave}
              open={view === 'form'}
              onOpenChange={(next) => {
                if (!next) backToList();
              }}
              cancelLabel="Back"
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
