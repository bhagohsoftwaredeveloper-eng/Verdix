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

const terminalSchema = z.object({
  name: z.string().min(1, 'Terminal name is required'),
  location: z.string().optional(),
  ipAddress: z.string().optional(),
});

type TerminalFormValues = z.infer<typeof terminalSchema>;

export function ManagePosTerminalsDialog() {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [terminals, setTerminals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [terminalToDelete, setTerminalToDelete] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  const form = useForm<TerminalFormValues>({
    resolver: zodResolver(terminalSchema),
    defaultValues: {
      name: '',
      location: '',
      ipAddress: '',
    },
  });

  const fetchTerminals = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/pos-terminals');
      const result = await response.json();
      if (result.success) {
        setTerminals(result.data);
      }
    } catch (error) {
      console.error('Error fetching terminals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTerminals();
    }
  }, [open]);

  async function onSubmit(values: TerminalFormValues) {
    setIsSaving(true);
    try {
      const response = await fetch('/api/pos-terminals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Terminal Added',
          description: `Terminal "${values.name}" has been successfully added.`,
        });
        form.reset();
        fetchTerminals();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to add terminal.',
        });
      }
    } catch (error) {
      console.error('Error adding terminal:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add terminal. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!terminalToDelete) return;

    try {
      const response = await fetch(`/api/pos-terminals?id=${terminalToDelete.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Terminal Deleted',
          description: `Terminal "${terminalToDelete.name}" has been successfully deleted.`,
        });
        fetchTerminals();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to delete terminal.',
        });
      }
    } catch (error) {
      console.error('Error deleting terminal:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete terminal. Please try again.',
      });
    } finally {
      setTerminalToDelete(null);
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
        <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage POS Terminals</DialogTitle>
            <DialogDescription>
              Add new terminals or manage existing ones
            </DialogDescription>
          </DialogHeader>

          {/* Add Terminal Form */}
          <div className="py-4 border-b">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terminal Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., POS 1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Front Counter" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <FormField
                    control={form.control}
                    name="ipAddress"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>IP Address</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 192.168.1.100" {...field} />
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

          {/* Terminals List */}
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : terminals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                      No terminals found.
                    </TableCell>
                  </TableRow>
                ) : (
                  terminals.map((terminal) => (
                    <TableRow key={terminal.id}>
                      <TableCell className="font-medium">{terminal.name}</TableCell>
                      <TableCell>{terminal.location || '-'}</TableCell>
                      <TableCell>{terminal.ipAddress || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                          onClick={() => setTerminalToDelete({ id: terminal.id, name: terminal.name })}
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

      <AlertDialog open={!!terminalToDelete} onOpenChange={(open) => !open && setTerminalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the terminal "{terminalToDelete?.name}". This action cannot be undone.
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
