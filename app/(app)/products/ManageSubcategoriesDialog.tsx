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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Category } from '@/lib/types';
import { getSubcategories, addSubcategory, updateSubcategory, deleteSubcategory } from './actions';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Pencil, Trash2, Loader2, ListTree } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


function SubcategoryDialog({ subcategory, onSave, children, disabled }: { subcategory?: Category, onSave: (name: string) => Promise<void>, children: React.ReactNode, disabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(subcategory?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Subcategory name cannot be empty.',
      });
      return;
    }
    setIsSaving(true);
    try {
      await onSave(name);
      toast({
        title: subcategory ? 'Subcategory Updated' : 'Subcategory Added',
        description: `Subcategory "${name}" has been successfully saved.`,
      });
      setIsOpen(false);
      if (!subcategory) setName('');
    } catch (error) {
      console.error('Failed to save subcategory', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save subcategory. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild disabled={disabled}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{subcategory ? 'Edit Subcategory' : 'Add New Subcategory'}</DialogTitle>
          <DialogDescription>
            {subcategory ? `Editing the subcategory "${subcategory.name}".` : 'Enter the name for the new subcategory.'}
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
              placeholder="e.g., Gaming Mice"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Saving...' : 'Save Subcategory'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubcategoryRow({ subcategory, onSubcategoryUpdated, onSubcategoryDeleted }: { subcategory: Category; onSubcategoryUpdated: () => void; onSubcategoryDeleted: () => void }) {
  const { toast } = useToast();

  const handleUpdate = async (name: string) => {
    const result = await updateSubcategory(subcategory.id, name);
    if (result.success) {
      toast({
        title: 'Subcategory Updated',
        description: result.message,
      });
      onSubcategoryUpdated();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
    }
  };

  const handleDelete = async () => {
    const result = await deleteSubcategory(subcategory.id);
    if (result.success) {
      toast({
        title: 'Subcategory Deleted',
        description: result.message,
      });
      onSubcategoryDeleted();
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
      <TableCell className="font-medium">{subcategory.name}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <SubcategoryDialog subcategory={subcategory} onSave={handleUpdate}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          </SubcategoryDialog>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function SubcategorySkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-5 w-48" />
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

export function ManageSubcategoriesDialog({ trigger, onSubcategoryAdded }: { trigger?: React.ReactNode; onSubcategoryAdded?: () => void }) {
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSubcategories = async () => {
    const subs = await getSubcategories();
    setSubcategories(subs);
    setIsLoading(false);
  };

  useEffect(() => {
    loadSubcategories();
  }, []);

  const handleAddSubcategory = async (name: string) => {
    const result = await addSubcategory(name);
    if (result.success) {
      loadSubcategories();
      onSubcategoryAdded?.();
    }
  };

  const handleSubcategoryUpdated = () => {
    loadSubcategories();
  };

  const handleSubcategoryDeleted = () => {
    loadSubcategories();
  };

  const dialogTrigger = trigger || (
    <Button variant="outline">
      <ListTree className="mr-2 h-4 w-4" />
      Manage Subcategories
    </Button>
  );

  return (
     <Dialog>
      <DialogTrigger asChild>
        {dialogTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Subcategories</DialogTitle>
          <DialogDescription>
            Add, edit, or delete your product subcategories.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
            <div className="flex justify-end mb-4">
                <SubcategoryDialog onSave={handleAddSubcategory}>
                    <Button size="sm">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Subcategory
                    </Button>
                </SubcategoryDialog>
            </div>
            <Card>
                <CardContent className='p-0'>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>
                            <span className="sr-only">Actions</span>
                        </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({ length: 4 }).map((_, i) => <SubcategorySkeleton key={i} />)}
                        {!isLoading && subcategories.map((subcategory) => (
                        <SubcategoryRow key={subcategory.id} subcategory={subcategory} onSubcategoryUpdated={handleSubcategoryUpdated} onSubcategoryDeleted={handleSubcategoryDeleted} />
                        ))}
                         {!isLoading && subcategories.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center h-24">
                                    No subcategories found. Add a subcategory to get started.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
        <DialogFooter>
          <DialogTrigger asChild>
            <Button variant="outline">Close</Button>
          </DialogTrigger>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
