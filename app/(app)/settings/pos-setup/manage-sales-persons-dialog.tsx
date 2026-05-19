'use client';

import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SalesPerson } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Pencil, Trash2, Loader2, UsersIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';

function SalesPersonDialog({ salesPerson, onSave, children, disabled }: { salesPerson?: SalesPerson, onSave: (name: string, contactNumber?: string) => Promise<void>, children: React.ReactNode, disabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(salesPerson?.name || '');
  const [contactNumber, setContactNumber] = useState(salesPerson?.contactNumber || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Sales person name cannot be empty.',
      });
      return;
    }
    setIsSaving(true);
    try {
      await onSave(name, contactNumber);
      toast({
        title: salesPerson ? 'Sales Person Updated' : 'Sales Person Added',
        description: `Sales person "${name}" has been successfully saved.`,
      });
      setIsOpen(false);
      if (!salesPerson) {
        setName('');
        setContactNumber('');
      }
    } catch (error) {
      console.error('Failed to save sales person', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save sales person. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild disabled={disabled}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{salesPerson ? 'Edit Sales Person' : 'Add New Sales Person'}</DialogTitle>
          <DialogDescription>
            {salesPerson ? `Editing the sales person "${salesPerson.name}".` : 'Enter the name and contact number for the new sales person.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., John Doe"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contactNumber" className="text-right">
              Contact Number
            </Label>
            <Input
              id="contactNumber"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              className="col-span-3"
              placeholder="e.g., +1-555-0101"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Saving...' : 'Save Sales Person'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SalesPersonRow({ salesPerson, onUpdate, onDelete }: { salesPerson: SalesPerson, onUpdate: () => void, onDelete: () => void }) {
  const { toast } = useToast();

  const handleUpdate = async (name: string, contactNumber?: string) => {
    try {
      const response = await fetch(getApiUrl(`/sales-persons/${salesPerson.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, contactNumber }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update sales person');
      }

      toast({
        title: 'Sales Person Updated',
        description: `Sales person "${name}" has been successfully updated.`,
      });
      onUpdate();
    } catch (error: any) {
      console.error('Error updating sales person:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update sales person. Please try again.',
      });
    }
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete the sales person "${salesPerson.name}"? This cannot be undone.`)) {
      try {
        const response = await fetch(getApiUrl(`/sales-persons/${salesPerson.id}`), {
          method: 'DELETE',
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to delete sales person');
        }

        toast({
          title: 'Sales Person Deleted',
          description: `Sales person "${salesPerson.name}" has been deleted.`,
        });
        onDelete();
      } catch (error: any) {
        console.error("Error deleting sales person: ", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || 'Failed to delete sales person. It might be in use.',
        });
      }
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{salesPerson.name}</TableCell>
      <TableCell>{salesPerson.contactNumber || 'N/A'}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <SalesPersonDialog salesPerson={salesPerson} onSave={handleUpdate}>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
          </SalesPersonDialog>
          <Button variant="destructive" size="icon" className="h-8 w-8" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function SalesPersonSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-5 w-48" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-32" />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ManageSalesPersonsDialog({ trigger, onChange, open, onOpenChange }: { trigger?: React.ReactNode, onChange?: () => void, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newContact, setNewContact] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();

  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;

  const fetchSalesPersons = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(getApiUrl('/sales-persons?activeOnly=false'));
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const result = await response.json();

      if (result.success) {
        setSalesPersons(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch sales persons');
      }
    } catch (error) {
      console.error('Error fetching sales persons:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load sales persons.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSalesPersons();
    }
  }, [isOpen]);

  const handleAddSalesPerson = async () => {
    if (!newName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Sales person name cannot be empty.',
      });
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch(getApiUrl('/sales-persons'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName, contactNumber: newContact }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to add sales person');
      }

      toast({
        title: 'Sales Person Added',
        description: `Sales person "${newName}" has been successfully saved.`,
      });

      setNewName('');
      setNewContact('');
      await fetchSalesPersons(); // Refresh the list
      onChange?.(); // Notify parent component
    } catch (error: any) {
      console.error('Error adding sales person:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add sales person.',
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdate = () => {
    fetchSalesPersons(); // Refresh the list
    onChange?.(); // Notify parent component
  };

  const handleDelete = () => {
    fetchSalesPersons(); // Refresh the list
    onChange?.(); // Notify parent component
  };

  return (
     <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
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
          <DialogDescription>
            Add, edit, or delete your sales persons.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
            <div className="grid grid-cols-3 gap-4 mb-4 items-end">
                <div className="grid gap-2">
                    <Label htmlFor="new-name">Name</Label>
                    <Input 
                        id="new-name"
                        placeholder="e.g., John Doe" 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)} 
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="new-contact">Contact Number</Label>
                    <Input 
                        id="new-contact"
                        placeholder="e.g., +1-555-0101" 
                        value={newContact} 
                        onChange={(e) => setNewContact(e.target.value)} 
                    />
                </div>
                <Button onClick={handleAddSalesPerson} disabled={isAdding || !newName.trim()}>
                    {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                    {isAdding ? 'Adding...' : 'Add Sales Person'}
                </Button>
            </div>
            <Card>
                <CardContent className='p-0'>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact Number</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({ length: 4 }).map((_, i) => <SalesPersonSkeleton key={i} />)}
                        {salesPersons?.map((salesPerson) => (
                          <SalesPersonRow
                            key={salesPerson.id}
                            salesPerson={salesPerson}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                          />
                        ))}
                         {!isLoading && salesPersons?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24">
                                    No sales persons found.
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
