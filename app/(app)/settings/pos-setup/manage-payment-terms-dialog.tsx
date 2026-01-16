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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const paymentTermSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  type: z.string().min(1, 'Type is required'),
  numberOfDaysMonth: z.string().optional(),
});

type PaymentTermFormValues = z.infer<typeof paymentTermSchema>;

interface ManagePaymentTermsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPaymentTermsUpdated?: () => void;
  trigger?: React.ReactNode;
}

export function ManagePaymentTermsDialog({ 
  open: controlledOpen, 
  onOpenChange: setControlledOpen, 
  onPaymentTermsUpdated,
  trigger 
}: ManagePaymentTermsDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [isSaving, setIsSaving] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [termToDelete, setTermToDelete] = useState<{ id: string; description: string } | null>(null);
  const [customTypes, setCustomTypes] = useState<any[]>([]);
  const [showAddTypeDialog, setShowAddTypeDialog] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [editingTerm, setEditingTerm] = useState<any | null>(null);
  const { toast } = useToast();

  const form = useForm<PaymentTermFormValues>({
    resolver: zodResolver(paymentTermSchema),
    defaultValues: {
      description: '',
      type: '',
      numberOfDaysMonth: '',
    },
  });

  const fetchPaymentTerms = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/payment-terms');
      const result = await response.json();
      if (result.success) {
        setPaymentTerms(result.data);
      }
    } catch (error) {
      console.error('Error fetching payment terms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaymentTermTypes = async () => {
    try {
      setIsLoadingTypes(true);
      const response = await fetch('/api/payment-term-types');
      const result = await response.json();
      if (result.success) {
        setCustomTypes(result.data);
      }
    } catch (error) {
      console.error('Error fetching payment term types:', error);
    } finally {
      setIsLoadingTypes(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPaymentTerms();
      fetchPaymentTermTypes();
    }
  }, [open]);

  async function onSubmit(values: PaymentTermFormValues) {
    setIsSaving(true);
    try {
      const url = editingTerm ? '/api/payment-terms' : '/api/payment-terms';
      const method = editingTerm ? 'PUT' : 'POST';
      const body = editingTerm ? { id: editingTerm.id, ...values } : values;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: editingTerm ? 'Payment Term Updated' : 'Payment Term Added',
          description: `Payment term has been successfully ${editingTerm ? 'updated' : 'added'}.`,
        });
        form.reset();
        setEditingTerm(null);
        fetchPaymentTerms();
        if (onPaymentTermsUpdated) {
          onPaymentTermsUpdated();
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || `Failed to ${editingTerm ? 'update' : 'add'} payment term.`,
        });
      }
    } catch (error) {
      console.error(`Error ${editingTerm ? 'updating' : 'adding'} payment term:`, error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to ${editingTerm ? 'update' : 'add'} payment term. Please try again.`,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!termToDelete) return;

    try {
      const response = await fetch(`/api/payment-terms?id=${termToDelete.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Payment Term Deleted',
          description: `Payment term has been successfully deleted.`,
        });
        fetchPaymentTerms();
        if (onPaymentTermsUpdated) {
          onPaymentTermsUpdated();
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to delete payment term.',
        });
      }
    } catch (error) {
      console.error('Error deleting payment term:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete payment term. Please try again.',
      });
    } finally {
      setTermToDelete(null);
    }
  }

  function handleEdit(term: any) {
    setEditingTerm(term);
    form.reset({
      description: term.description || '',
      type: term.type || '',
      numberOfDaysMonth: term.numberOfDaysMonth || '',
    });
  }

  async function handleAddType() {
    if (!newTypeName.trim()) return;

    try {
      const response = await fetch('/api/payment-term-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTypeName.trim() }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Type Added',
          description: `"${newTypeName.trim()}" has been added to the type list.`,
        });
        setNewTypeName('');
        setShowAddTypeDialog(false);
        fetchPaymentTermTypes();
        form.setValue('type', newTypeName.trim());
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to add type.',
        });
      }
    } catch (error) {
      console.error('Error adding type:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add type. Please try again.',
      });
    }
  }

  async function handleDeleteType(typeId: string, typeName: string) {
    try {
      const response = await fetch(`/api/payment-term-types?id=${typeId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Type Removed',
          description: `"${typeName}" has been removed from the type list.`,
        });
        fetchPaymentTermTypes();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to delete type.',
        });
      }
    } catch (error) {
      console.error('Error deleting type:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete type. Please try again.',
      });
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger !== undefined ? (
          trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>
        ) : (
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2 text-primary hover:text-primary/80">
              <span className="text-xs font-medium">Manage</span>
            </Button>
          </DialogTrigger>
        )}
        <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Payment Terms</DialogTitle>
            <DialogDescription>
              Add new payment terms or manage existing ones
            </DialogDescription>
          </DialogHeader>

          {/* Add Payment Term Form */}
          <div className="py-4 border-b">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex items-end gap-3">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter description" {...field} className="h-10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="w-40">
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {customTypes.map((type) => (
                              <SelectItem key={type.id} value={type.name}>
                                {type.name}
                              </SelectItem>
                            ))}
                            <div className="border-t mt-1 pt-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setShowAddTypeDialog(true);
                                }}
                                className="w-full text-left px-2 py-1.5 text-sm text-primary hover:bg-accent rounded-sm flex items-center gap-2"
                              >
                                <Plus className="h-3 w-3" />
                                Add Type
                              </button>
                            </div>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="numberOfDaysMonth"
                    render={({ field }) => (
                      <FormItem className="w-48">
                        <FormLabel>Number of Days/Month</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter number" {...field} className="h-10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {editingTerm && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setEditingTerm(null);
                        form.reset({
                          description: '',
                          type: '',
                          numberOfDaysMonth: '',
                        });
                      }}
                      className="h-10"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button type="submit" disabled={isSaving} className="h-10">
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : editingTerm ? (
                      <>
                        <Plus className="h-4 w-4" />
                        <span className="ml-2">Update</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span className="ml-2">Add</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Payment Terms List */}
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Days/Month</TableHead>
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
                ) : paymentTerms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                      No payment terms found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentTerms.map((term) => (
                    <TableRow key={term.id}>
                      <TableCell className="font-medium">{term.description}</TableCell>
                      <TableCell>{term.type}</TableCell>
                      <TableCell>{term.numberOfDaysMonth || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(term)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                            onClick={() => setTermToDelete({ id: term.id, description: term.description })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

      <AlertDialog open={!!termToDelete} onOpenChange={(open) => !open && setTermToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the payment term "{termToDelete?.description}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.stopPropagation(); confirmDelete(); }} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Type Dialog */}
      <Dialog open={showAddTypeDialog} onOpenChange={setShowAddTypeDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Type</DialogTitle>
            <DialogDescription>
              Enter a name for the new payment term type
            </DialogDescription>
          </DialogHeader>
          
          {/* Add New Type Input - Moved to Top */}
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <label htmlFor="newType" className="text-sm font-medium">
                New Type Name
              </label>
              <Input
                id="newType"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="e.g., Net 90, Prepaid"
                className="h-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddType();
                  }
                }}
              />
            </div>
            <Button type="button" onClick={handleAddType} disabled={!newTypeName.trim()} className="h-10">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          {/* Existing Types Table */}
          <div className="border rounded-md">
            <div className="max-h-[150px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Existing Types</TableHead>
                    <TableHead className="text-right w-20">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTypes ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : customTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                        No types available
                      </TableCell>
                    </TableRow>
                  ) : (
                    customTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-medium">{type.name}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                            onClick={() => handleDeleteType(type.id, type.name)}
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
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setShowAddTypeDialog(false);
              setNewTypeName('');
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
