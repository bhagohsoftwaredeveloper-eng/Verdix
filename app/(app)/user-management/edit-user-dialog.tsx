
'use client';

import { useState, useEffect, useRef } from 'react';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { ALL_PERMISSIONS } from './permissions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getApiUrl } from '@/lib/api-config';
import { AddUserTypeDialog } from './add-user-type-dialog';
import { Plus } from 'lucide-react';


type User = {
  uid: string;
  username: string | null;
  displayName: string | null;
  photoURL: string | null;
  disabled: boolean;
  creationTime: string;
  userType?: string;
  permissions: string[];
};

const formSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  displayName: z.string().min(1, 'Display name is required'),
  password: z.string().transform(v => v === '' ? undefined : v).pipe(z.string().min(6, 'Password must be at least 6 characters long').optional()),
  userType: z.string().min(1, 'User type is required'),
  permissions: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one permission.",
  }),
});
type FormValues = z.infer<typeof formSchema>;

export function EditUserDialog({ 
  user, 
  onUserUpdated,
  open,
  onOpenChange
}: { 
  user: User, 
  onUserUpdated: () => void,
  open: boolean,
  onOpenChange: (open: boolean) => void
}) {
  const [userTypes, setUserTypes] = useState<any[]>([]);
  const [isUserTypeDialogOpen, setIsUserTypeDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: user.username || '',
      displayName: user.displayName || '',
      password: '',
      userType: user.userType || '',
      permissions: user.permissions || [],
    },
  });

  async function fetchUserTypes() {
    try {
      const res = await fetch(getApiUrl('/user-types'));
      const data = await res.json();
      setUserTypes(data);
    } catch (error) {
      console.error('Failed to fetch user types:', error);
    }
  }

  useEffect(() => {
    if (open) {
      fetchUserTypes();
    }
  }, [open]);


  useEffect(() => {
    if (open) {
      form.reset({
        username: user.username || '',
        displayName: user.displayName || '',
        password: '',
        userType: user.userType || '',
        permissions: user.permissions || [],
      });
    }
  }, [open, user, form]);

  const { isSubmitting } = form.formState;
  const watchedUserType = form.watch('userType');

  const lastUserTypeRef = useRef(user.userType);
  const isInitializingRef = useRef(true);

  useEffect(() => {
    if (open && watchedUserType && userTypes.length > 0) {
      if (isInitializingRef.current) {
        lastUserTypeRef.current = watchedUserType;
        isInitializingRef.current = false;
        return;
      }

      if (watchedUserType !== lastUserTypeRef.current) {
        const selectedType = userTypes.find(t => t.name === watchedUserType);
        if (selectedType) {
          form.setValue('permissions', selectedType.permissions || []);
        }
        lastUserTypeRef.current = watchedUserType;
      }
    } else if (!open) {
      isInitializingRef.current = true;
    }
  }, [watchedUserType, form, open, userTypes]);


  async function onSubmit(values: FormValues) {
    try {
      const permissionsToSend = values.permissions;

      // Call the API to update user
      const response = await fetch(getApiUrl(`/users/${user.uid}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: values.username,
          displayName: values.displayName,
          password: values.password,
          userType: values.userType,
          permissions: permissionsToSend,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user');
      }

      toast({
        title: 'User Updated',
        description: `Details for ${values.username} have been updated successfully.`,
      });

      onUserUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to update user:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Update User',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden flex flex-col max-h-[95vh] border-none shadow-2xl">
        <DialogHeader className="p-8 pb-4 bg-muted/30">
          <DialogTitle className="text-2xl font-bold">Edit User</DialogTitle>
          <DialogDescription className="text-base">
            Modify details and permissions for {user.username}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Left Column: User Details */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold border-b pb-2">User Details</h3>
                  </div>
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="Full name" {...field} value={field.value ?? ''} className="bg-white" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="username" {...field} value={field.value ?? ''} className="bg-white" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="userType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Type</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      if (value === 'CREATE_NEW') {
                        setIsUserTypeDialogOpen(true);
                      } else {
                        field.onChange(value);
                      }
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select a user type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {userTypes.map((type) => (
                        <SelectItem key={type.id} value={type.name}>
                          {type.name}
                        </SelectItem>
                      ))}
                      <div className="border-t my-1" />
                      <SelectItem value="CREATE_NEW" className="text-primary font-medium focus:text-primary">
                        <div className="flex items-center">
                          <Plus className="mr-2 h-4 w-4" />
                          Create New User Type...
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <FormMessage />
                </FormItem>
              )}
            />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password (leave blank to keep current)</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} value={field.value ?? ''} placeholder="New password" title="Leave blank to keep current password" className="bg-white h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Right Column: Permissions */}
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="permissions"
                    render={() => (
                      <FormItem className="space-y-6">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold border-b pb-2">Permissions & Access</h3>
                          <p className="text-sm text-muted-foreground">
                            Select individual access rights for this user.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-x-4 gap-y-3 p-4 rounded-xl bg-muted/20 border border-muted-foreground/10">
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
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), permission.id])
                                      : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== permission.id
                                        )
                                      )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {permission.label}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                        ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="p-8 pt-4 bg-muted/30 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
      <AddUserTypeDialog 
        open={isUserTypeDialogOpen} 
        onOpenChange={setIsUserTypeDialogOpen} 
        onUserTypeUpdated={() => {
          fetchUserTypes();
        }}
      />
    </Dialog>

  );
}
