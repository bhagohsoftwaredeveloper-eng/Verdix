'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Loader2, UsersIcon } from 'lucide-react';
import { useManageSalesPersons } from './use-manage-sales-persons';
import { SalesPersonRow } from './SalesPersonRow';

type Props = {
  trigger?: React.ReactNode;
  onChange?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function ManageSalesPersonsDialog({ trigger, onChange, open, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;

  const {
    salesPersons, isLoading,
    newName, setNewName, newContact, setNewContact,
    isAdding, handleAdd, handleUpdate, handleDelete,
  } = useManageSalesPersons(isOpen, onChange);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button variant="outline">
            <UsersIcon className="mr-2 h-4 w-4" />
            Manage Sales Persons
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage Sales Persons</DialogTitle>
          <DialogDescription>Add, edit, or delete your sales persons.</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <div className="grid grid-cols-3 gap-4 mb-4 items-end">
            <div className="grid gap-2">
              <Label htmlFor="new-name">Name</Label>
              <Input id="new-name" placeholder="e.g., John Doe" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-contact">Contact Number</Label>
              <Input id="new-contact" placeholder="e.g., +1-555-0101" value={newContact} onChange={e => setNewContact(e.target.value)} />
            </div>
            <Button onClick={handleAdd} disabled={isAdding || !newName.trim()}>
              {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              {isAdding ? 'Adding...' : 'Add Sales Person'}
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact Number</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Skeleton className="h-9 w-24" />
                          <Skeleton className="h-9 w-28" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {salesPersons.map(sp => (
                    <SalesPersonRow
                      key={sp.id}
                      salesPerson={sp}
                      onUpdate={(name, contact) => handleUpdate(sp.id, name, contact)}
                      onDelete={() => handleDelete(sp)}
                    />
                  ))}
                  {!isLoading && salesPersons.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-24">No sales persons found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
