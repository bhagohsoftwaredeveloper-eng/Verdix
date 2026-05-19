
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Input } from '@/components/ui/input';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { ALL_PERMISSIONS } from './permissions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getApiUrl } from '@/lib/api-config';
import { AddUserTypeDialog } from './add-user-type-dialog';
import { Plus } from 'lucide-react';
import { logActivity } from '@/lib/client-activity-logger';


const formSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  userType: z.string().min(1, 'User type is required'),
  permissions: z.array(z.string()).refine(value => value.some(item => item), {
    message: "You have to select at least one permission.",
  }),
});
type FormValues = z.infer<typeof formSchema>;

export function AddUserDialog({ onUserAdded }: { onUserAdded: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUserTypeDialogOpen, setIsUserTypeDialogOpen] = useState(false);
  const [userTypes, setUserTypes] = useState<any[]>([]);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      username: '',
      password: '',
      userType: '',
      permissions: ['view_dashboard'],
    },
  });

  const { isSubmitting } = form.formState;
  const watchedUserType = form.watch('userType');

  async function fetchUserTypes() {
    try {
      const res = await fetch(getApiUrl('/user-types'));
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setUserTypes(data);
    } catch (error) {
      console.error('Failed to fetch user types:', error);
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchUserTypes();
    }
  }, [isOpen]);


  useEffect(() => {
    if (!watchedUserType || userTypes.length === 0) return;
    
    const selectedType = userTypes.find(t => t.name === watchedUserType);
    if (selectedType) {
      form.setValue('permissions', selectedType.permissions || []);
    }
  }, [watchedUserType, userTypes, form]);


  async function createUser(fullName: string, username: string, password: string, userType: string, permissions: string[]) {
    try {
      const permissionsToSend = permissions;

      console.log('Creating user with:', { fullName, username, password, permissions: permissionsToSend });
      // Call the API to create user
      const response = await fetch(getApiUrl('/users'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: fullName,
          username,
          email: username, // Send both for compatibility
          password,
          userType,
          permissions: permissionsToSend,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      await logActivity({
        action: 'CREATE',
        module: 'USERS',
        description: `Created user: ${fullName} (${username}) — Type: ${userType}`,
        referenceId: result.uid,
      });
      toast({
        title: 'User Created',
        description: `User ${fullName} (${username}) has been created successfully.`,
      });
      onUserAdded(); // Callback to refresh the user list
      setIsOpen(false);
      form.reset();
    } catch (error: any) {
      console.error('Failed to create user:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Create User',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  }

  async function onSubmit(values: FormValues) {
    await createUser(values.fullName, values.username, values.password, values.userType, values.permissions);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden flex flex-col max-h-[95vh] border-none shadow-2xl">
        <DialogHeader className="p-8 pb-4 bg-muted/30">
          <DialogTitle className="text-2xl font-bold">Add New User</DialogTitle>
          <DialogDescription className="text-base">
            Enter the details for the new user and assign specific permissions.
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
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="John Doe" {...field} value={field.value ?? ''} className="bg-white" />
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
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} value={field.value ?? ''} className="bg-white h-11" />
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
                                    disabled={watchedUserType === 'Cashier'}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, permission.id])
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
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create User'
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
          // Optional: we can try to auto-select the new one if we returned it from API
        }}
      />
    </Dialog>

  );
}
