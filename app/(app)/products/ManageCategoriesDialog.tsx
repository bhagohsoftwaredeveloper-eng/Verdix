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

function CategoryDialog({ category, onSave, children, disabled }: { category?: Category, onSave: (name: string, markupPercentage?: number) => Promise<void>, children: React.ReactNode, disabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(category?.name || '');
  const [markupPercentage, setMarkupPercentage] = useState(category?.markupPercentage?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setName(category?.name || '');
      setMarkupPercentage(category?.markupPercentage?.toString() || '');
    }
  }, [isOpen, category]);

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
      await onSave(name, markupPercentage ? parseFloat(markupPercentage) : undefined);
      toast({
        title: category ? 'Category Updated' : 'Category Added',
        description: `Category "${name}" has been successfully saved.`,
      });
      setIsOpen(false);
      if (!category) {
        setName('');
        setMarkupPercentage('');
      }
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
      <DialogContent className="z-[100] sm:max-w-[425px] !rounded-3xl !duration-500 ease-in-out data-[state=open]:!animate-in data-[state=closed]:!animate-out data-[state=closed]:!fade-out-0 data-[state=open]:!fade-in-0 data-[state=closed]:!zoom-out-95 data-[state=open]:!zoom-in-90 data-[state=closed]:!slide-out-to-top-[5%] data-[state=open]:!slide-in-from-top-[5%]">
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          <DialogDescription>
            {category ? `Editing the category "${category.name}".` : 'Enter the name and default markup for the new category.'}
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
            {isSaving ? 'Saving...' : 'Save Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryRow({ category, onCategoryUpdated, onCategoryDeleted }: { category: Category; onCategoryUpdated: () => void; onCategoryDeleted: () => void }) {
  const { toast } = useToast();

  const handleUpdate = async (name: string, markupPercentage?: number) => {
    const result = await updateCategory(category.id, name, markupPercentage);
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
      <TableCell className="text-center">{category.markupPercentage !== undefined && category.markupPercentage !== null ? `${category.markupPercentage}%` : '-'}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <CategoryDialog category={category} onSave={handleUpdate}>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
              <Pencil className="h-4 w-4 text-muted-foreground transition-colors hover:text-primary" />
              <span className="sr-only">Edit</span>
            </Button>
          </CategoryDialog>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-muted" 
            onClick={handleDelete}
            disabled={category.productCount !== undefined && category.productCount > 0}
            title={category.productCount !== undefined && category.productCount > 0 ? "Cannot delete category with products assigned" : "Delete category"}
          >
            <Trash2 className={`h-4 w-4 ${category.productCount !== undefined && category.productCount > 0 ? 'text-muted-foreground/50' : 'text-muted-foreground transition-colors hover:text-destructive'}`} />
            <span className="sr-only">Delete</span>
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

export function ManageCategoriesDialog({ trigger, onCategoryAdded, open, onOpenChange }: { trigger?: React.ReactNode; onCategoryAdded?: () => void; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;

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

  const handleAddCategory = async (name: string, markupPercentage?: number) => {
    const result = await addCategory(name, markupPercentage);
    if (result.success) {
      await refreshCategories();
      onCategoryAdded?.();
    }
  };

  const showTrigger = trigger !== null;
  const dialogTrigger = trigger || (
    <Button variant="outline">
      <ListTree className="mr-2 h-4 w-4" />
      Manage Categories
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
                        <TableHead className="text-center">Markup</TableHead>
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
                                <TableCell colSpan={3} className="text-center h-24">
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
