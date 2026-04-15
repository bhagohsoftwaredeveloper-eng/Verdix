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
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { ALL_PERMISSIONS } from './permissions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getApiUrl } from '@/lib/api-config';
import { Label } from '@/components/ui/label';


const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, 'Select at least one permission'),
});

type FormValues = z.infer<typeof formSchema>;

export function AddUserTypeDialog({ 
  open, 
  onOpenChange, 
  onUserTypeUpdated,
  editingType 
}: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  onUserTypeUpdated: () => void,
  editingType?: any
}) {
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      permissions: [],
    },
  });

  useEffect(() => {
    if (editingType) {
      form.reset({
        name: editingType.name,
        description: editingType.description || '',
        permissions: editingType.permissions || [],
      });
    } else if (open) {
      form.reset({
        name: '',
        description: '',
        permissions: [],
      });
    }
  }, [editingType, open, form]);

  const { isSubmitting } = form.formState;

  async function onSubmit(values: FormValues) {
    try {
      const url = editingType 
        ? getApiUrl(`/user-types/${editingType.id}`)
        : getApiUrl('/user-types');
      
      const method = editingType ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save user type');
      }

      toast({
        title: editingType ? 'User Type Updated' : 'User Type Created',
        description: `User type "${values.name}" has been ${editingType ? 'updated' : 'created'} successfully.`,
      });
      onUserTypeUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 bg-muted/30">
          <DialogTitle>{editingType ? 'Edit User Type' : 'Create New User Type'}</DialogTitle>
          <DialogDescription>
            Define a role and its default permissions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Manager" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="What is this role for?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="permissions"
                  render={() => (
                    <FormItem className="space-y-4">
                      <Label className="text-sm font-medium">Permissions</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 rounded-md border bg-muted/10">
                        {ALL_PERMISSIONS.map((permission) => (
                          <FormField
                            key={permission.id}
                            control={form.control}
                            name="permissions"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={permission.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(permission.id)}
                                      onCheckedChange={(checked: boolean) => {
                                        return checked
                                          ? field.onChange([...field.value, permission.id])
                                          : field.onChange(
                                              field.value.filter((v: string) => v !== permission.id)
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer text-sm">
                                    {permission.label}
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />


              </div>
            </ScrollArea>
            <DialogFooter className="p-6 pt-4 bg-muted/30 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingType ? 'Update' : 'Create'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
