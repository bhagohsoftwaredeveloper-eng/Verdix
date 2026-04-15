'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Pencil, Trash2, Loader2, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getDepartments, addDepartment, updateDepartment, deleteDepartment } from './actions';

type Department = {
  id: string;
  name: string;
  markupPercentage?: number;
  created_at?: string;
  updated_at?: string;
};

function DepartmentDialog({ 
  department, 
  onSave, 
  children, 
  disabled 
}: { 
  department?: Department, 
  onSave: (name: string, markupPercentage?: number) => Promise<void>, 
  children: React.ReactNode, 
  disabled?: boolean 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(department?.name || '');
  const [markupPercentage, setMarkupPercentage] = useState(department?.markupPercentage?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setName(department?.name || '');
      setMarkupPercentage(department?.markupPercentage?.toString() || '');
    }
  }, [isOpen, department]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Department name cannot be empty.',
      });
      return;
    }
    setIsSaving(true);
    try {
      await onSave(name, markupPercentage ? parseFloat(markupPercentage) : undefined);
      toast({
        title: department ? 'Department Updated' : 'Department Added',
        description: `Department "${name}" has been successfully saved.`,
      });
      setIsOpen(false);
      if (!department) {
        setName('');
        setMarkupPercentage('');
      }
    } catch (error) {
      console.error('Failed to save department', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save department. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild disabled={disabled}>{children}</DialogTrigger>
      <DialogContent className="z-[100] sm:max-w-[425px] !rounded-3xl !duration-500 ease-in-out data-[state=open]:!animate-in data-[state=closed]:!animate-out data-[state=closed]:!fade-out-0 data-[state=open]:!fade-in-0 data-[state=closed]:!zoom-out-95 data-[state=open]:!zoom-in-90 data-[state=closed]:!slide-out-to-top-[5%] data-[state=open]:!slide-in-from-top-[5%]">
        <DialogHeader>
          <DialogTitle>{department ? 'Edit Department' : 'Add New Department'}</DialogTitle>
          <DialogDescription>
            {department ? `Editing the department "${department.name}".` : 'Enter the name and default markup for the new department.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Electronics"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="markup" className="text-right">
              Markup %
            </Label>
            <Input
              id="markup"
              type="number"
              value={markupPercentage}
              onChange={(e) => setMarkupPercentage(e.target.value)}
              className="col-span-3"
              placeholder="e.g., 20"
              min="0"
              step="0.01"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Saving...' : 'Save Department'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DepartmentRow({ 
  department, 
  onDepartmentUpdated, 
  onDepartmentDeleted 
}: { 
  department: Department; 
  onDepartmentUpdated: () => void; 
  onDepartmentDeleted: () => void 
}) {
  const { toast } = useToast();

  const handleUpdate = async (name: string, markupPercentage?: number) => {
    const result = await updateDepartment(department.id, name, markupPercentage);
    if (result.success) {
      toast({
        title: 'Department Updated',
        description: result.message,
      });
      onDepartmentUpdated();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
    }
  };

  const handleDelete = async () => {
    const result = await deleteDepartment(department.id);
    if (result.success) {
      toast({
        title: 'Department Deleted',
        description: result.message,
      });
      onDepartmentDeleted();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{department.name}</TableCell>
      <TableCell className="text-center">{department.markupPercentage !== undefined && department.markupPercentage !== null ? `${department.markupPercentage}%` : '-'}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <DepartmentDialog department={department} onSave={handleUpdate}>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
              <Pencil className="h-4 w-4 text-muted-foreground transition-colors hover:text-primary" />
              <span className="sr-only">Edit</span>
            </Button>
          </DepartmentDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                <Trash2 className="h-4 w-4 text-muted-foreground transition-colors hover:text-destructive" />
                <span className="sr-only">Delete</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="!rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the department
                  "{department.name}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

function DepartmentSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-5 w-48" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16" />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ManageDepartmentsDialog({ 
  trigger, 
  onDepartmentAdded, 
  open, 
  onOpenChange 
}: { 
  trigger?: React.ReactNode; 
  onDepartmentAdded?: () => void; 
  open?: boolean; 
  onOpenChange?: (open: boolean) => void 
}) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;

  const refreshDepartments = async () => {
    try {
      const loadedDepartments = await getDepartments();
      setDepartments(loadedDepartments);
    } catch (error) {
      console.error('Error loading departments', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshDepartments();
    }
  }, [isOpen]);

  const handleAddDepartment = async (name: string, markupPercentage?: number) => {
    const result = await addDepartment(name, markupPercentage);
    if (result.success) {
      await refreshDepartments();
      onDepartmentAdded?.();
    }
  };

  const showTrigger = trigger !== null;
  const dialogTrigger = trigger || (
    <Button variant="outline">
      <Building2 className="mr-2 h-4 w-4" />
      Manage Departments
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          {dialogTrigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-3xl !rounded-3xl !duration-500 ease-in-out data-[state=open]:!animate-in data-[state=closed]:!animate-out data-[state=closed]:!fade-out-0 data-[state=open]:!fade-in-0 data-[state=closed]:!zoom-out-95 data-[state=open]:!zoom-in-90 data-[state=closed]:!slide-out-to-top-[5%] data-[state=open]:!slide-in-from-top-[5%]">
        <DialogHeader>
          <DialogTitle>Manage Departments</DialogTitle>
          <DialogDescription>
            Add, edit, or delete your product departments.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
            <div className="flex justify-end mb-4">
                <DepartmentDialog onSave={handleAddDepartment}>
                    <Button size="sm">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Department
                    </Button>
                </DepartmentDialog>
            </div>
            <Card>
                <CardContent className='p-0'>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="text-center">Markup</TableHead>
                        <TableHead>
                            <span className="sr-only">Actions</span>
                        </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({ length: 4 }).map((_, i) => <DepartmentSkeleton key={i} />)}
                        {!isLoading && departments.map((dept) => (
                        <DepartmentRow key={dept.id} department={dept} onDepartmentUpdated={refreshDepartments} onDepartmentDeleted={refreshDepartments} />
                        ))}
                         {!isLoading && departments.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24">
                                    No departments found. Add a department to get started.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
