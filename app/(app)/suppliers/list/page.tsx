'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Download, ChevronDown } from 'lucide-react';
import { SupplierFormDialog } from '../../products/suppliers/ManageSuppliersDialog';
import { SupplierListCard } from './SupplierListCard';
import { useSuppliersList } from './use-suppliers-list';

export default function SuppliersListPage() {
  const {
    loading, columns,
    globalFilter, setGlobalFilter,
    filters, setFilters,
    table, totalRows, startIndex, endIndex,
    editingSupplier, isEditDialogOpen, setIsEditDialogOpen,
    deletingSupplier, setDeletingSupplier, isDeleteDialogOpen, setIsDeleteDialogOpen,
    handleAddSupplier, handleUpdateSupplier, handleDeleteSupplier, handleExport,
  } = useSuppliersList();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Supplier List</h2>
          <p className="text-muted-foreground">Manage your suppliers and their details.</p>
        </div>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" /> Export <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>Export as PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <SupplierFormDialog onSave={handleAddSupplier}>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Supplier</Button>
          </SupplierFormDialog>
        </div>
      </div>

      <SupplierListCard
        table={table}
        loading={loading}
        columnCount={columns.length}
        filters={filters}
        setFilters={setFilters}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        totalRows={totalRows}
        startIndex={startIndex}
        endIndex={endIndex}
      />

      <SupplierFormDialog
        supplier={editingSupplier as any}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={(data) => handleUpdateSupplier(editingSupplier!.id, data)}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the supplier
              <span className="font-medium text-foreground"> {deletingSupplier?.name} </span>
              and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingSupplier(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingSupplier) {
                  handleDeleteSupplier(deletingSupplier.id);
                  setDeletingSupplier(null);
                  setIsDeleteDialogOpen(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
