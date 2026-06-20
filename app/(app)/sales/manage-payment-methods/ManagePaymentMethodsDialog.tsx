'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { PlusCircle, Search } from 'lucide-react';
import { useManagePaymentMethods } from './use-manage-payment-methods';
import { AddPaymentMethodDialog } from './AddPaymentMethodDialog';
import { PaymentMethodRow, PaymentMethodSkeleton } from './PaymentMethodRow';

interface ManagePaymentMethodsDialogProps {
  trigger?: React.ReactNode;
  onChange?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ManagePaymentMethodsDialog({ trigger, onChange, open, onOpenChange }: ManagePaymentMethodsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;

  const m = useManagePaymentMethods(isOpen, onChange);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Manage Payment Methods</DialogTitle>
          <DialogDescription>Add, edit, or delete your payment methods.</DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col overflow-hidden min-h-0 flex-1">
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="relative flex-1 max-w-xs mr-3 ml-1 mt-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search payment methods..."
                value={m.searchQuery}
                onChange={(e) => m.setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <AddPaymentMethodDialog onSave={m.handleAddMethod}>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Method
              </Button>
            </AddPaymentMethodDialog>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <ScrollArea className="max-h-[45vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {m.isLoading && Array.from({ length: 4 }).map((_, i) => <PaymentMethodSkeleton key={i} />)}
                    {m.paginatedPaymentMethods?.map((method) => (
                      <PaymentMethodRow
                        key={method.id}
                        paymentMethod={method}
                        paymentMethods={m.paymentMethods}
                        onUpdate={m.handleUpdate}
                        onDelete={m.handleDelete}
                      />
                    ))}
                    {!m.isLoading && m.filteredPaymentMethods?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center h-24">No payment methods found.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {!m.isLoading && m.filteredPaymentMethods.length > 0 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => m.setCurrentPage(prev => Math.max(1, prev - 1))}
                      className={m.currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: m.totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => m.setCurrentPage(page)}
                        isActive={m.currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => m.setCurrentPage(prev => Math.min(m.totalPages, prev + 1))}
                      className={m.currentPage === m.totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
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
