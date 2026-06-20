'use client';

import { TableCell, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { MoreHorizontal, Pencil, Trash2, Ban, UserCheck } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { User } from './user-row-types';
import { useUserRow } from './use-user-row';

export type { User };

function getInitials(name?: string | null, username?: string | null) {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase();
  if (username) return username.substring(0, 2).toUpperCase();
  return '??';
}

type Props = {
  user: User;
  onUserUpdated: () => void;
  onEdit: (user: User) => void;
};

export function UserRow({ user, onUserUpdated, onEdit }: Props) {
  const {
    isDeleteDialogOpen, setIsDeleteDialogOpen,
    isDeleting, handleToggleStatus, handleDeleteConfirm,
  } = useUserRow(user, onUserUpdated);

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src={user.photoURL || undefined} alt={user.displayName || undefined} />
              <AvatarFallback>{getInitials(user.displayName, user.username)}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <span className="font-medium">{user.displayName || 'No Name'}</span>
              {user.userType && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{user.userType}</Badge>
              )}
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
                <Pencil className="mr-2 h-4 w-4" /> Edit User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleStatus}>
                {user.disabled
                  ? <><UserCheck className="mr-2 h-4 w-4" /> Enable User</>
                  : <><Ban className="mr-2 h-4 w-4" /> Disable User</>
                }
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete User
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
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function UserSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-32" />
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
