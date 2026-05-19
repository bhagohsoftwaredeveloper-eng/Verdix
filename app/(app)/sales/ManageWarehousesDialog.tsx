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
import { Warehouse } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Pencil, Trash2, Loader2, WarehouseIcon, MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';
import { v4 as uuidv4 } from 'uuid';

export function WarehouseDialog({ warehouse, onSave, children, disabled, open, onOpenChange }: { warehouse?: Warehouse, onSave: (name: string, location?: string) => Promise<void>, children: React.ReactNode, disabled?: boolean | null, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;
  const [name, setName] = useState(warehouse?.name || '');
  const [location, setLocation] = useState(warehouse?.location || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Warehouse name cannot be empty.',
      });
      return;
    }
    setIsSaving(true);
    try {
      await onSave(name, location);
      toast({
        title: warehouse ? 'Warehouse Updated' : 'Warehouse Added',
        description: `Warehouse "${name}" has been successfully saved.`,
      });
      setIsOpen(false);
      if (!warehouse) {
        setName('');
        setLocation('');
      }
    } catch (error) {
      console.error('Failed to save warehouse', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save warehouse. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild disabled={disabled ?? undefined}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{warehouse ? 'Edit Warehouse' : 'Add New Warehouse'}</DialogTitle>
          <DialogDescription>
            {warehouse ? `Editing the warehouse "${warehouse.name}".` : 'Enter the name and location for the new warehouse.'}
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
              placeholder="e.g., Main Warehouse"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="location" className="text-right">
              Location
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Building A, Floor 2"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Saving...' : 'Save Warehouse'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WarehouseRow({ warehouse, onUpdate, onDelete }: { warehouse: Warehouse, onUpdate: () => void, onDelete: () => void }) {
  const { toast } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [dependencyInfo, setDependencyInfo] = useState<{
    products: number;
    salesOrders: number;
    salesTransactions: number;
  } | null>(null);
  const [isLoadingDependencies, setIsLoadingDependencies] = useState(false);

  const handleUpdate = async (name: string, location?: string) => {
    try {
      const response = await fetch(getApiUrl(`/warehouses/${warehouse.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, location }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update warehouse');
      }

      toast({
        title: 'Warehouse Updated',
        description: `Warehouse "${name}" has been successfully updated.`,
      });
      onUpdate();
    } catch (error: any) {
      console.error('Error updating warehouse:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update warehouse. Please try again.',
      });
    }
  };

  const fetchDependencyInfo = async () => {
    setIsLoadingDependencies(true);
    try {
      // Fetch dependency counts
      const [productsRes, ordersRes, transactionsRes] = await Promise.all([
        fetch(getApiUrl(`/products?warehouseId=${warehouse.id}&countOnly=true`)),
        fetch(getApiUrl(`/sales/orders?warehouseId=${warehouse.id}&countOnly=true`)),
        fetch(getApiUrl(`/sales?warehouse=${encodeURIComponent(warehouse.name)}&countOnly=true`))
      ]);

      const [productsData, ordersData, transactionsData] = await Promise.all([
        productsRes.json(),
        ordersRes.json(),
        transactionsRes.json()
      ]);

      setDependencyInfo({
        products: productsData.total || 0,
        salesOrders: ordersData.total || 0,
        salesTransactions: transactionsData.total || 0
      });
    } catch (error) {
      console.error('Error fetching dependency info:', error);
      setDependencyInfo({ products: 0, salesOrders: 0, salesTransactions: 0 });
    } finally {
      setIsLoadingDependencies(false);
    }
  };

  const handleDeleteClick = async () => {
    await fetchDependencyInfo();
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleteDialogOpen(false);
    try {
      const response = await fetch(getApiUrl(`/warehouses/${warehouse.id}`), {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete warehouse');
      }

      toast({
        title: 'Warehouse Deleted',
        description: `Warehouse "${warehouse.name}" has been deleted.`,
      });
      onDelete();
    } catch (error: any) {
      console.error("Error deleting warehouse: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete warehouse. It might be in use.',
      });
    }
  };

  return (
    <>
      <TableRow>
        <TableCell className="font-mono text-sm">{warehouse.id}</TableCell>
        <TableCell className="font-medium">{warehouse.name}</TableCell>
        <TableCell>{warehouse.location || 'N/A'}</TableCell>
        <TableCell>{warehouse.isActive ? 'Yes' : 'No'}</TableCell>
        <TableCell>{warehouse.createdAt ? new Date(warehouse.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
        <TableCell className="text-right">
          <div className="relative inline-block">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsMenuOpen((v) => !v)}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
            {isMenuOpen && (
              <>
                {/* backdrop to close menu */}
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                <div className="absolute right-0 top-9 z-50 min-w-[120px] rounded-md border bg-popover shadow-md text-sm">
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted rounded-t-md"
                    onClick={() => { setIsMenuOpen(false); setIsEditOpen(true); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2 text-destructive hover:bg-destructive/10 rounded-b-md"
                    onClick={() => { setIsMenuOpen(false); handleDeleteClick(); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
          {/* Edit dialog controlled externally */}
          <WarehouseDialog
            warehouse={warehouse}
            onSave={handleUpdate}
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
          >
            <span />
          </WarehouseDialog>
        </TableCell>
      </TableRow>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Warehouse</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the warehouse "{warehouse.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {isLoadingDependencies ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking dependencies...
            </div>
          ) : dependencyInfo ? (
            <div className="py-4">
              <div className="text-sm text-muted-foreground mb-2">
                This warehouse has the following associated data:
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Products:</span>
                  <span className={dependencyInfo.products > 0 ? "text-destructive font-medium" : ""}>
                    {dependencyInfo.products}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sales Orders:</span>
                  <span className={dependencyInfo.salesOrders > 0 ? "text-destructive font-medium" : ""}>
                    {dependencyInfo.salesOrders}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sales Transactions:</span>
                  <span className={dependencyInfo.salesTransactions > 0 ? "text-destructive font-medium" : ""}>
                    {dependencyInfo.salesTransactions}
                  </span>
                </div>
              </div>

              {(dependencyInfo.products > 0 || dependencyInfo.salesOrders > 0 || dependencyInfo.salesTransactions > 0) && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <div className="text-sm text-destructive">
                    ⚠️ This warehouse cannot be deleted because it has associated data. Please reassign or remove the associated records first.
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isLoadingDependencies || !!(dependencyInfo && (dependencyInfo.products > 0 || dependencyInfo.salesOrders > 0 || dependencyInfo.salesTransactions > 0))}
            >
              Delete Warehouse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function WarehouseSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-5 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-48" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-32" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-8" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-20" />
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

export function ManageWarehousesDialog({ trigger, onChange, open, onOpenChange }: { trigger?: React.ReactNode, onChange?: () => void, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [internalOpen, setInternalOpen] = useState(false);
  const { toast } = useToast();

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;

  const fetchWarehouses = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(getApiUrl('/warehouses?activeOnly=false'));
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const result = await response.json();

      if (result.success) {
        setWarehouses(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch warehouses');
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load warehouses.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWarehouses();
    }
  }, [isOpen]);

  const handleAddWarehouse = async (name: string, location?: string) => {
    try {
      const response = await fetch(getApiUrl('/warehouses'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: `wh_${uuidv4().substring(0, 8)}`,
          name, 
          location 
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to add warehouse');
      }

      await fetchWarehouses(); // Refresh the list
      onChange?.(); // Notify parent component
    } catch (error: any) {
      console.error('Error adding warehouse:', error);
      throw error; // Re-throw to let the dialog handle the error
    }
  };

  const handleUpdate = () => {
    fetchWarehouses(); // Refresh the list
    onChange?.(); // Notify parent component
  };

  const handleDelete = () => {
    fetchWarehouses(); // Refresh the list
    onChange?.(); // Notify parent component
  };

  return (
     <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage Warehouses</DialogTitle>
          <DialogDescription>
            Add, edit, or delete your warehouses.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
            <div className="flex justify-end mb-4">
                <WarehouseDialog onSave={handleAddWarehouse}>
                    <Button size="sm">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Warehouse
                    </Button>
                </WarehouseDialog>
            </div>
            <Card>
                <CardContent className='p-0'>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>
                            <span className="sr-only">Actions</span>
                        </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({ length: 4 }).map((_, i) => <WarehouseSkeleton key={i} />)}
                        {warehouses?.map((warehouse) => (
                          <WarehouseRow
                            key={warehouse.id}
                            warehouse={warehouse}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                          />
                        ))}
                         {!isLoading && warehouses?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    No warehouses found.
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
