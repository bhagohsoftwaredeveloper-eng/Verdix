
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
import { format } from 'date-fns';
import { MoreHorizontal, Pencil, Trash2, Ban, UserCheck, Search, X } from 'lucide-react';
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
import { getApiUrl } from '@/lib/api-config';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { Input } from '@/components/ui/input';
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

type User = {
  uid: string;
  username: string | null;
  displayName: string | null;
  photoURL: string | null;
  disabled: boolean;
  userType?: string;
  creationTime: string;
  permissions: string[];
};

const mockUsers: User[] = [
  {
    uid: 'mock-admin-01',
    username: 'admin',
    displayName: 'Super Admin',
    photoURL: '',
    disabled: false,
    creationTime: new Date('2023-01-15T10:00:00Z').toISOString(),
    permissions: ['super_admin'],
  },
  {
    uid: 'mock-cashier-01',
    username: 'cashier',
    displayName: 'John Cashier',
    photoURL: '',
    disabled: false,
    creationTime: new Date('2023-02-20T11:30:00Z').toISOString(),
    permissions: ['access_pos', 'view_dashboard'],
  },
  {
    uid: 'mock-inventory-01',
    username: 'inventory',
    displayName: 'Jane Stocker',
    photoURL: '',
    disabled: true,
    creationTime: new Date('2023-03-10T09:00:00Z').toISOString(),
    permissions: ['manage_inventory', 'manage_products'],
  },
];


function UserRow({ 
  user, 
  onUserUpdated,
  onEdit
}: { 
  user: User, 
  onUserUpdated: () => void,
  onEdit: (user: User) => void
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const getInitials = (name?: string | null, username?: string | null) => {
    if (name) {
      const names = name.split(' ');
      return names.map(n => n[0]).join('').toUpperCase();
    }
    if (username) {
      return username.substring(0, 2).toUpperCase();
    }
    return '??';
  };

  const handleToggleStatus = async () => {
    try {
      const res = await fetch(getApiUrl('/users'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          disabled: !user.disabled,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update user status');
      }

      toast({
        title: user.disabled ? 'User enabled' : 'User disabled',
        description: `The user has been successfully ${user.disabled ? 'enabled' : 'disabled'}.`,
      });
      onUserUpdated();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update user status.',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      const res = await fetch(getApiUrl(`/users?uid=${user.uid}`), {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }
      toast({
        title: 'User deleted',
        description: 'The user has been successfully removed.',
      });
      onUserUpdated();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete the user.',
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <TableRow>
      <TableCell>
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || undefined} />
            <AvatarFallback>{getInitials(user.displayName, user.username)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{user.displayName || 'No Name'}</span>
              {user.userType && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                  {user.userType}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm font-medium text-muted-foreground">{user.username}</div>
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
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">User Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(user)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit User
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleStatus}>
              {user.disabled ? (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Enable User
                </>
              ) : (
                <>
                  <Ban className="mr-2 h-4 w-4" />
                  Disable User
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user "{user.displayName || user.username}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
          </div>
        </div>
      </TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-6 w-48 rounded-full" /></TableCell>
      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
    </TableRow>
  );
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(getApiUrl('/users'));
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = () => {
    setActiveSearch(searchQuery);
    setCurrentPage(1); // Reset to first page on search
  };

  const clearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      // Small delay to allow exit animation before clearing the user
      setTimeout(() => setEditingUser(null), 300);
    }
  };

  // Filter logic
  const filteredUsers = users.filter(user => {
    if (!activeSearch) return true;
    const search = activeSearch.toLowerCase();
    return (
      (user.displayName?.toLowerCase().includes(search)) ||
      (user.username?.toLowerCase().includes(search))
    );
  });

  // Pagination logic
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                A list of all users in your application.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-[300px]">
                <Input
                  placeholder="Search name or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pr-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
                    onClick={clearSearch}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
              <Button onClick={handleSearch} size="icon" variant="secondary">
                <Search className="h-4 w-4" />
              </Button>
              <AddUserDialog onUserAdded={fetchUsers} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="max-h-[600px] overflow-y-auto relative border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-[250px]">Full Name</TableHead>
                  <TableHead className="w-[150px]">Username</TableHead>
                  <TableHead className="hidden md:table-cell">Permissions</TableHead>
                  <TableHead className="hidden sm:table-cell">Created On</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: pageSize }).map((_, i) => <UserSkeleton key={i} />)}
                {!isLoading && paginatedUsers.map((user: User) => (
                  <UserRow 
                    key={user.uid} 
                    user={user} 
                    onUserUpdated={fetchUsers}
                    onEdit={handleEdit}
                  />
                ))}
                {!isLoading && paginatedUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {error || 'No users found.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {!isLoading && users.length > 0 && (
            <div className="py-4 px-2 border-t">
              <DataTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalItems}
                setPage={setCurrentPage}
                setPageSize={setPageSize}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={isEditDialogOpen}
          onOpenChange={handleOpenChange}
          onUserUpdated={fetchUsers}
        />
      )}
    </div>
  );
}
