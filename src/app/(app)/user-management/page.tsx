
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { listAllUsers, type ListUsersOutput } from '@/ai/flows/list-users';
import { format } from 'date-fns';
import { MoreHorizontal, Pencil, Trash2, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddUserDialog } from './add-user-dialog';
import { EditUserDialog } from './edit-user-dialog';
import { useToast } from '@/hooks/use-toast';

type User = ListUsersOutput[number];

const mockUsers: User[] = [
  {
    uid: 'mock-admin-01',
    email: 'admin@example.com',
    displayName: 'Super Admin',
    photoURL: '',
    disabled: false,
    creationTime: new Date('2023-01-15T10:00:00Z').toISOString(),
    permissions: ['super_admin'],
  },
  {
    uid: 'mock-cashier-01',
    email: 'cashier@example.com',
    displayName: 'John Cashier',
    photoURL: '',
    disabled: false,
    creationTime: new Date('2023-02-20T11:30:00Z').toISOString(),
    permissions: ['access_pos', 'view_dashboard'],
  },
  {
    uid: 'mock-inventory-01',
    email: 'inventory@example.com',
    displayName: 'Jane Stocker',
    photoURL: '',
    disabled: true,
    creationTime: new Date('2023-03-10T09:00:00Z').toISOString(),
    permissions: ['manage_inventory', 'manage_products'],
  },
];


function UserRow({ user, onUserUpdated }: { user: User, onUserUpdated: () => void }) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${user.email || 'this user'}?`)) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/users?uid=${user.uid}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      toast({
        title: 'User Deleted',
        description: `User ${user.email} has been removed successfully.`,
      });
      onUserUpdated();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const names = name.split(' ');
      return names.map(n => n[0]).join('').toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return '??';
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? undefined} />
            <AvatarFallback>{getInitials(user.displayName ?? undefined, user.email ?? undefined)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{user.displayName || 'No Name'}</div>
            <div className="text-sm text-muted-foreground">{user.email || 'No Email'}</div>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex flex-wrap gap-1">
          {user.permissions?.map(permission => (
            <Badge key={permission} variant="secondary" className="font-normal">
              {permission.replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        {format(new Date(user.creationTime), 'PP')}
      </TableCell>
      <TableCell>
        <Badge variant={user.disabled ? 'destructive' : 'outline'}>
          {user.disabled ? 'Disabled' : 'Active'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
              <span className="sr-only">User Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <EditUserDialog user={user} onUserUpdated={onUserUpdated} />
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function UserSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-48 rounded-full" /></TableCell>
      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
    </TableRow>
  );
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<ListUsersOutput>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listAllUsers();
      setUsers(data);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError(err.message || 'Failed to load users. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              A list of all users in your application.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <AddUserDialog onUserAdded={fetchUsers} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-medium">Error</p>
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 h-8"
              onClick={fetchUsers}
            >
              Try Again
            </Button>
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead className="hidden md:table-cell">Permissions</TableHead>
                <TableHead className="hidden sm:table-cell">Created On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => <UserSkeleton key={i} />)}
              {!isLoading && !error && users.map(user => (
                <UserRow key={user.uid} user={user} onUserUpdated={fetchUsers} />
              ))}
              {!isLoading && !error && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p>No users found.</p>
                      <p className="text-sm">Click "Add User" to create your first user.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
