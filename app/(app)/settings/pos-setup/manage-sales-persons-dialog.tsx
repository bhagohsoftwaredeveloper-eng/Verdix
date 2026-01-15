'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const salesPersonSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactNumber: z.string().optional(),
});

type SalesPersonFormValues = z.infer<typeof salesPersonSchema>;

export function ManageSalesPersonsDialog() {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [salesPersons, setSalesPersons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  const form = useForm<SalesPersonFormValues>({
    resolver: zodResolver(salesPersonSchema),
    defaultValues: {
      name: '',
      contactNumber: '',
    },
  });

  const fetchSalesPersons = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/sales-persons');
      const result = await response.json();
      if (result.success) {
        setSalesPersons(result.data);
      }
    } catch (error) {
      console.error('Error fetching sales persons:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchSalesPersons();
    }
  }, [open]);

  async function onSubmit(values: SalesPersonFormValues) {
    setIsSaving(true);
    try {
      const response = await fetch('/api/sales-persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Sales Person Added',
          description: `Sales person "${values.name}" has been successfully added.`,
        });
        form.reset();
        fetchSalesPersons();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to add sales person.',
        });
      }
    } catch (error) {
      console.error('Error adding sales person:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add sales person. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!personToDelete) return;

    try {
      const response = await fetch(`/api/sales-persons?id=${personToDelete.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Sales Person Deleted',
          description: `Sales person "${personToDelete.name}" has been successfully deleted.`,
        });
        fetchSalesPersons();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to delete sales person.',
        });
      }
    } catch (error) {
      console.error('Error deleting sales person:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete sales person. Please try again.',
      });
    } finally {
      setPersonToDelete(null);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2 text-primary hover:text-primary/80">
            <span className="text-xs font-medium">Manage</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] h-[500px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Sales Persons</DialogTitle>
            <DialogDescription>
              Add new sales persons or manage existing ones
            </DialogDescription>
          </DialogHeader>

          {/* Add Sales Person Form */}
          <div className="py-4 border-b">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-end gap-2">
                  <FormField
                    control={form.control}
                    name="contactNumber"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Contact Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., +1-555-0101" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span className="ml-2">Add</span>
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Sales Persons List */}
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact Number</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : salesPersons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                      No sales persons found.
                    </TableCell>
                  </TableRow>
                ) : (
                  salesPersons.map((person) => (
                    <TableRow key={person.id}>
                      <TableCell className="font-medium">{person.name}</TableCell>
                      <TableCell>{person.contactNumber || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          onClick={() => setPersonToDelete({ id: person.id, name: person.name })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!personToDelete} onOpenChange={(open) => !open && setPersonToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the sales person "{personToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.stopPropagation(); confirmDelete(); }} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
