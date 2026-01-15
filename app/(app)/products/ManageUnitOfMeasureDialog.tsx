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
import { UnitOfMeasure } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Pencil, Trash2, Loader2, ListTree } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUnitsOfMeasure, addUnitOfMeasure, updateUnitOfMeasure, deleteUnitOfMeasure } from './actions';

function UnitOfMeasureDialog({ unit, onSave, children, disabled }: { unit?: UnitOfMeasure, onSave: (name: string, abbreviation: string) => Promise<void>, children: React.ReactNode, disabled?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(unit?.name || '');
  const [abbreviation, setAbbreviation] = useState(unit?.abbreviation || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim() || !abbreviation.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'All fields must be filled out.',
      });
      return;
    }
    setIsSaving(true);
    try {
      await onSave(name, abbreviation);
      toast({
        title: unit ? 'Unit Updated' : 'Unit Added',
        description: `Unit "${name}" has been successfully saved.`,
      });
      setIsOpen(false);
      if (!unit) {
        setName('');
        setAbbreviation('');
      }
    } catch (error) {
      console.error('Failed to save unit of measure', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save unit of measure. Please try again.',
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
          <DialogTitle>{unit ? 'Edit Unit of Measure' : 'Add New Unit of Measure'}</DialogTitle>
          <DialogDescription>
            {unit ? `Editing the unit "${unit.name}".` : 'Enter the details for the new unit of measure.'}
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
              placeholder="e.g., Piece"
            />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="abbreviation" className="text-right">
              Abbreviation
            </Label>
            <Input
              id="abbreviation"
              value={abbreviation}
              onChange={(e) => setAbbreviation(e.target.value)}
              className="col-span-3"
              placeholder="e.g., pc"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim() || !abbreviation.trim()}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? 'Saving...' : 'Save Unit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UnitOfMeasureRow({ unit, onUnitChanged }: { unit: UnitOfMeasure; onUnitChanged: () => void }) {
  const { toast } = useToast();

  const handleUpdate = async (name: string, abbreviation: string) => {
    const result = await updateUnitOfMeasure(unit.id, name, abbreviation);
    if (result.success) {
      toast({
        title: 'Unit Updated',
        description: result.message,
      });
      onUnitChanged();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
    }
  };

  const handleDelete = async () => {
    const result = await deleteUnitOfMeasure(unit.id);
    if (result.success) {
      toast({
        title: 'Unit Deleted',
        description: result.message,
      });
      onUnitChanged();
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
      <TableCell className="font-medium">{unit.name}</TableCell>
      <TableCell>{unit.abbreviation}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <UnitOfMeasureDialog unit={unit} onSave={handleUpdate}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
          </UnitOfMeasureDialog>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function UnitOfMeasureSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-5 w-32" />
      </TableCell>
       <TableCell>
        <Skeleton className="h-5 w-24" />
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

export function ManageUnitOfMeasureDialog({ trigger, onUnitAdded }: { trigger?: React.ReactNode, onUnitAdded?: () => void }) {
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const refreshUnits = async () => {
    try {
      const loadedUnits = await getUnitsOfMeasure();
      setUnits(loadedUnits);
    } catch (error) {
      console.error('Error loading units of measure', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshUnits();
    }
  }, [isOpen]);

  const handleAddUnit = async (name: string, abbreviation: string) => {
    const result = await addUnitOfMeasure(name, abbreviation);
    if (result.success) {
      await refreshUnits();
      onUnitAdded?.();
      setIsOpen(false);
    }
  };

  const dialogTrigger = trigger || (
    <Button variant="outline">
      <ListTree className="mr-2 h-4 w-4" />
      Manage Units
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {dialogTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage Units of Measure</DialogTitle>
          <DialogDescription>
            Add, edit, or delete your units of measure.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <div className="flex justify-end mb-4">
            <UnitOfMeasureDialog onSave={handleAddUnit}>
              <Button size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Unit
              </Button>
            </UnitOfMeasureDialog>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Abbreviation</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && Array.from({ length: 4 }).map((_, i) => (
                    <UnitOfMeasureSkeleton key={i} />
                  ))}
                  {!isLoading &&
                    units.map((unit) => (
                      <UnitOfMeasureRow
                        key={unit.id}
                        unit={unit}
                        onUnitChanged={() => { refreshUnits(); onUnitAdded?.(); }}
                      />
                    ))}
                  {!isLoading && units.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-24">
                        No units found. Add a unit to get started.
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
