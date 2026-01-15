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
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Pencil, Trash2, Loader2, ListTree } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCategories, addCategory, updateCategory, deleteCategory } from './actions';

function CategoryDialog({ category, onSave, children, disabled }: { category?: Category, onSave: (name: string) => Promise<void>, children: React.ReactNode, disabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(category?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Category name cannot be empty.',
      });
      return;
    }
    setIsSaving(true);
    try {
      await onSave(name);
      toast({
        title: category ? 'Category Updated' : 'Category Added',
        description: `Category "${name}" has been successfully saved.`,
      });
      setIsOpen(false);
      if (!category) setName('');
    } catch (error) {
      console.error('Failed to save category', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save category. Please try again.',
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
          <DialogTitle>{category ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          <DialogDescription>
            {category ? `Editing the category "${category.name}".` : 'Enter the name for the new category.'}
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Saving...' : 'Save Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryRow({ category, onCategoryUpdated, onCategoryDeleted }: { category: Category; onCategoryUpdated: () => void; onCategoryDeleted: () => void }) {
  const { toast } = useToast();

  const handleUpdate = async (name: string) => {
    const result = await updateCategory(category.id, name);
    if (result.success) {
      toast({
        title: 'Category Updated',
        description: result.message,
      });
      onCategoryUpdated();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
    }
  };

  const handleDelete = async () => {
    const result = await deleteCategory(category.id);
    if (result.success) {
      toast({
        title: 'Category Deleted',
        description: result.message,
      });
      onCategoryDeleted();
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
      <TableCell className="font-medium">{category.name}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <CategoryDialog category={category} onSave={handleUpdate}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          </CategoryDialog>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function CategorySkeleton() {
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

export function ManageCategoriesDialog({ trigger, onCategoryAdded }: { trigger?: React.ReactNode; onCategoryAdded?: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshCategories = async () => {
    try {
      const loadedCategories = await getCategories();
      setCategories(loadedCategories);
    } catch (error) {
      console.error('Error loading categories', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshCategories();
  }, []);

  const handleAddCategory = async (name: string) => {
    const result = await addCategory(name);
    if (result.success) {
      await refreshCategories();
      onCategoryAdded?.();
    }
  };

  const dialogTrigger = trigger || (
    <Button variant="outline">
      <ListTree className="mr-2 h-4 w-4" />
      Manage Categories
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {dialogTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
          <DialogDescription>
            Add, edit, or delete your product categories.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <div className="flex justify-end mb-4">
            <CategoryDialog onSave={handleAddCategory}>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </CategoryDialog>
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
                  {isLoading && Array.from({ length: 4 }).map((_, i) => <CategorySkeleton key={i} />)}
                  {!isLoading && categories.map((category) => (
                    <CategoryRow key={category.id} category={category} onCategoryUpdated={refreshCategories} onCategoryDeleted={refreshCategories} />
                  ))}
                  {!isLoading && categories.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center h-24">
                        No categories found. Add a category to get started.
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
