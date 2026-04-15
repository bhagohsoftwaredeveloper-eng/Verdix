'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Pencil, Trash2, Settings2 } from 'lucide-react';
import { getApiUrl } from '@/lib/api-config';
import { AddUserTypeDialog } from './add-user-type-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
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

export function ManageUserTypesDialog() {
  const [userTypes, setUserTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingType, setDeletingType] = useState<any>(null);
  const { toast } = useToast();

  const fetchUserTypes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(getApiUrl('/user-types'));
      const data = await res.json();
      setUserTypes(data);
    } catch (error) {
      console.error('Failed to fetch user types:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserTypes();
  }, [fetchUserTypes]);

  const handleEdit = (type: any) => {
    setEditingType(type);
    setIsAddOpen(true);
  };

  const handleDeleteClick = (type: any) => {
    setDeletingType(type);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingType) return;
    try {
      const res = await fetch(getApiUrl(`/user-types/${deletingType.id}`), {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete user type');
      }
      toast({
        title: 'User Type Deleted',
        description: 'The user type has been removed.',
      });
      fetchUserTypes();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingType(null);
    }
  };

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings2 className="mr-2 h-4 w-4" />
            User Types
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold">Manage User Types</DialogTitle>
                <DialogDescription>
                  Define and manage roles with specific permissions.
                </DialogDescription>
              </div>
              <Button size="sm" onClick={() => { setEditingType(null); setIsAddOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Type
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">Loading...</TableCell>
                  </TableRow>
                ) : userTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No user types defined.</TableCell>
                  </TableRow>
                ) : (
                  userTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{type.name}</span>
                          <span className="text-xs text-muted-foreground">{type.description}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                            {type.permissions?.length || 0} Permissions
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(type)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteClick(type)}>
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
        </DialogContent>
      </Dialog>

      <AddUserTypeDialog 
        open={isAddOpen} 
        onOpenChange={setIsAddOpen} 
        onUserTypeUpdated={fetchUserTypes} 
        editingType={editingType}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the user type "{deletingType?.name}". 
              This cannot be undone and will fail if any users are currently assigned to this type.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
