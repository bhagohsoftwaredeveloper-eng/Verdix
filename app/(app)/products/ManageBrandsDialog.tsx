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
import { Brand } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Pencil, Trash2, Loader2, ListTree } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getBrands, addBrand, updateBrand, deleteBrand } from './actions';

function BrandDialog({ brand, onSave, children, disabled }: { brand?: Brand, onSave: (name: string) => Promise<void>, children: React.ReactNode, disabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(brand?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Brand name cannot be empty.',
      });
      return;
    }
    setIsSaving(true);
    try {
      await onSave(name);
      toast({
        title: brand ? 'Brand Updated' : 'Brand Added',
        description: `Brand "${name}" has been successfully saved.`,
      });
      setIsOpen(false);
      if (!brand) setName('');
    } catch (error) {
      console.error('Failed to save brand', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save brand. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild disabled={disabled}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] !rounded-3xl !duration-500 ease-in-out data-[state=open]:!animate-in data-[state=closed]:!animate-out data-[state=closed]:!fade-out-0 data-[state=open]:!fade-in-0 data-[state=closed]:!zoom-out-95 data-[state=open]:!zoom-in-90 data-[state=closed]:!slide-out-to-top-[5%] data-[state=open]:!slide-in-from-top-[5%]">
        <DialogHeader>
          <DialogTitle>{brand ? 'Edit Brand' : 'Add New Brand'}</DialogTitle>
          <DialogDescription>
            {brand ? `Editing the brand "${brand.name}".` : 'Enter the name for the new brand.'}
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
              placeholder="e.g., Logitech"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Saving...' : 'Save Brand'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BrandRow({ brand, onBrandUpdated, onBrandDeleted }: { brand: Brand; onBrandUpdated: () => void; onBrandDeleted: () => void }) {
  const { toast } = useToast();

  const handleUpdate = async (name: string) => {
    const result = await updateBrand(brand.id, name);
    if (result.success) {
      toast({
        title: 'Brand Updated',
        description: result.message,
      });
      onBrandUpdated();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
    }
  };

  const handleDelete = async () => {
    const result = await deleteBrand(brand.id);
    if (result.success) {
      toast({
        title: 'Brand Deleted',
        description: result.message,
      });
      onBrandDeleted();
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
      <TableCell className="font-medium">{brand.name}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <BrandDialog brand={brand} onSave={handleUpdate}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          </BrandDialog>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function BrandSkeleton() {
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

export function ManageBrandsDialog({ trigger, onBrandAdded, open, onOpenChange }: { trigger?: React.ReactNode; onBrandAdded?: () => void; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshBrands = async () => {
    try {
      const loadedBrands = await getBrands();
      setBrands(loadedBrands);
    } catch (error) {
      console.error('Error loading brands', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshBrands();
  }, []);

  const handleAddBrand = async (name: string) => {
    const result = await addBrand(name);
    if (result.success) {
      await refreshBrands();
      onBrandAdded?.();
    }
  };

  const dialogTrigger = trigger || (
    <Button variant="outline">
      <ListTree className="mr-2 h-4 w-4" />
      Manage Brands
    </Button>
  );

  return (
     <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {dialogTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl !rounded-3xl !duration-500 ease-in-out data-[state=open]:!animate-in data-[state=closed]:!animate-out data-[state=closed]:!fade-out-0 data-[state=open]:!fade-in-0 data-[state=closed]:!zoom-out-95 data-[state=open]:!zoom-in-90 data-[state=closed]:!slide-out-to-top-[5%] data-[state=open]:!slide-in-from-top-[5%]">
        <DialogHeader>
          <DialogTitle>Manage Brands</DialogTitle>
          <DialogDescription>
            Add, edit, or delete your product brands.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
            <div className="flex justify-end mb-4">
                <BrandDialog onSave={handleAddBrand}>
                    <Button size="sm">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Brand
                    </Button>
                </BrandDialog>
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
                        {isLoading && Array.from({ length: 4 }).map((_, i) => <BrandSkeleton key={i} />)}
                        {!isLoading && brands.map((brand) => (
                        <BrandRow key={brand.id} brand={brand} onBrandUpdated={refreshBrands} onBrandDeleted={refreshBrands} />
                        ))}
                         {!isLoading && brands.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center h-24">
                                    No brands found. Add a brand to get started.
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
