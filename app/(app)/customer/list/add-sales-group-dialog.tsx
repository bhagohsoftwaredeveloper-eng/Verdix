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
import { getApiUrl } from '@/lib/api-config';

const salesGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required'),
});

type SalesGroupFormValues = z.infer<typeof salesGroupSchema>;

interface AddSalesGroupDialogProps {
  onGroupAdded: (group: { id: string; name: string }) => void;
  onSalesGroupsUpdated?: () => void;
}

export function AddSalesGroupDialog({ onGroupAdded, onSalesGroupsUpdated }: AddSalesGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [salesGroups, setSalesGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  const form = useForm<SalesGroupFormValues>({
    resolver: zodResolver(salesGroupSchema),
    defaultValues: {
      name: '',
    },
  });

  const fetchSalesGroups = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(getApiUrl('/sales-groups'));
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const result = await response.json();
      if (result.success) {
        setSalesGroups(result.data);
      }
    } catch (error) {
      console.error('Error fetching sales groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchSalesGroups();
    }
  }, [open]);

  async function onSubmit(values: SalesGroupFormValues) {
    setIsSaving(true);
    try {
      const response = await fetch(getApiUrl('/sales-groups'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Sales Group Added',
          description: `Sales group "${values.name}" has been successfully added.`,
        });
        onGroupAdded(result.data);
        form.reset();
        fetchSalesGroups(); // Refresh the list
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to add sales group.',
        });
      }
    } catch (error) {
      console.error('Error adding sales group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add sales group. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!groupToDelete) return;

    try {
      const response = await fetch(getApiUrl(`/sales-groups?id=${groupToDelete.id}`), {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Sales Group Deleted',
          description: `Sales group "${groupToDelete.name}" has been successfully deleted.`,
        });
        fetchSalesGroups();
        if (onSalesGroupsUpdated) {
          onSalesGroupsUpdated();
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to delete sales group.',
        });
      }
    } catch (error) {
      console.error('Error deleting sales group:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete sales group. Please try again.',
      });
    } finally {
      setGroupToDelete(null);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 ml-2 px-2 text-primary hover:text-primary/80">
            <span className="text-xs font-medium">Manage</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] h-[500px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Sales Groups</DialogTitle>
            <DialogDescription>
              Add new sales groups or view existing ones.
            </DialogDescription>
          </DialogHeader>

          {/* Add Group Form */}
          <div className="py-4 border-b">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>New Group Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., VIP Customers" {...field} />
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
              </form>
            </Form>
          </div>

          {/* Groups List */}
          <div className="flex-1 overflow-auto mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group Name</TableHead>
                  <TableHead className="text-center">Status</TableHead>
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
                ) : salesGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                      No sales groups found.
                    </TableCell>
                  </TableRow>
                ) : (
                  salesGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">{group.name}</TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${group.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {group.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          onClick={() => setGroupToDelete({ id: group.id, name: group.name })}
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

      <AlertDialog open={!!groupToDelete} onOpenChange={(open) => !open && setGroupToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the sales group "{groupToDelete?.name}". This action cannot be undone.
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
