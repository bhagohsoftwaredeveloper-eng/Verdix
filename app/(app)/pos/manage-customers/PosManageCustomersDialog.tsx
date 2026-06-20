'use client';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
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
import { PlusCircle, Users } from 'lucide-react';
import { CustomerDialog } from './CustomerDialog';
import { CustomerRow } from './CustomerRow';
import { CustomerSkeleton } from './CustomerSkeleton';
import { useManageCustomers } from './use-manage-customers';
import type { PosManageCustomersDialogProps } from './manage-customers-types';

export function PosManageCustomersDialog({ onCustomersUpdated }: PosManageCustomersDialogProps) {
  const { customers, isLoading, isOpen, setIsOpen, refreshCustomers, handleAddCustomer } =
    useManageCustomers({ onCustomersUpdated });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users className="mr-2 h-4 w-4" /> Manage Customers
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage Customers</DialogTitle>
          <DialogDescription>Add, edit, or delete your customers.</DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <div className="flex justify-end mb-4">
            <CustomerDialog onSave={handleAddCustomer}>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Customer
              </Button>
            </CustomerDialog>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact No.</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && Array.from({ length: 2 }).map((_, i) => <CustomerSkeleton key={i} />)}
                  {!isLoading && customers.map((customer) => (
                    <CustomerRow key={customer.id} customer={customer} onCustomersUpdated={refreshCustomers} />
                  ))}
                  {!isLoading && customers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24">No customers found.</TableCell>
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
