'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users } from 'lucide-react';
import AddCustomerDialog from '@/app/(app)/customer/list/add-customer-dialog';
import { useManageCustomers } from './use-manage-customers';
import { CustomerRow, CustomerSkeleton } from './CustomerRow';

export function ManageCustomersDialog({ trigger }: { trigger?: React.ReactNode }) {
  const m = useManageCustomers();

  const dialogTrigger = trigger || (
    <Button variant="outline">
      <Users className="mr-2 h-4 w-4" />
      Manage Customers
    </Button>
  );

  return (
    <>
      <Dialog open={m.isOpen} onOpenChange={m.setIsOpen}>
        <DialogTrigger asChild>{dialogTrigger}</DialogTrigger>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Customers</DialogTitle>
            <DialogDescription>Add, edit, or delete your customers.</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <div className="flex justify-end mb-4">
              <Button size="sm" onClick={() => m.setShowAddDialog(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact No.</TableHead>
                      <TableHead>Payment Terms</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {m.loading && Array.from({ length: 4 }).map((_, i) => <CustomerSkeleton key={i} />)}
                    {m.customers?.map((customer) => (
                      <CustomerRow
                        key={customer.id}
                        customer={customer}
                        onEdit={m.setEditingCustomer}
                        onDelete={m.handleDeleteCustomer}
                        onToggleActive={m.handleToggleActive}
                      />
                    ))}
                    {!m.loading && m.customers?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">No customers found.</TableCell>
                      </TableRow>
                    )}
                    {m.error && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24 text-destructive">
                          Error loading customers: {m.error}
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

      <AddCustomerDialog onSave={m.handleAddCustomer} open={m.showAddDialog} onOpenChange={m.setShowAddDialog}>
        <div />
      </AddCustomerDialog>

      <AddCustomerDialog
        onSave={m.handleEditCustomer}
        open={!!m.editingCustomer}
        onOpenChange={(open: boolean) => !open && m.setEditingCustomer(null)}
        customer={m.editingCustomer}
      >
        <div />
      </AddCustomerDialog>
    </>
  );
}
