'use client';

import { useState } from 'react';
import { PlusCircle, Users } from 'lucide-react';

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { SupplierFormDialog } from './supplier-form-dialog';
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

  const { suppliers, isLoading, handleAddSupplier, handleUpdateSupplier, handleDeleteSupplier } =
    useManageSuppliers({ isOpen, onSupplierAdded });

  const showTrigger = trigger !== null;
  const dialogTrigger = trigger || (
    <Button variant="outline">
        <Users className="mr-2 h-4 w-4" />
        Manage Suppliers
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          {dialogTrigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-4xl !rounded-3xl !duration-500 ease-in-out data-[state=open]:!animate-in data-[state=closed]:!animate-out data-[state=closed]:!fade-out-0 data-[state=open]:!fade-in-0 data-[state=closed]:!zoom-out-95 data-[state=open]:!zoom-in-90 data-[state=closed]:!slide-out-to-top-[5%] data-[state=open]:!slide-in-from-top-[5%]">
        <DialogHeader>
          <DialogTitle>Manage Suppliers</DialogTitle>
          <DialogDescription>
            Add, edit, or delete your product suppliers.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
            <div className="flex justify-end mb-4">
                <SupplierFormDialog onSave={handleAddSupplier}>
                    <Button size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Supplier
                    </Button>
                </SupplierFormDialog>
            </div>
            <Card>
                <CardContent className='p-0'>
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
                              onUpdateSupplier={(data) => handleUpdateSupplier(supplier.id, data)}
                              onDeleteSupplier={() => handleDeleteSupplier(supplier.id)}
                            />
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No suppliers found. Add your first supplier above.
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
  );
}
