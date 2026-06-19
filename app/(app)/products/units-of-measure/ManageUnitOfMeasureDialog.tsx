'use client';

import { useState } from 'react';
import { PlusCircle, ListTree } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
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

import { UnitOfMeasureDialog } from './unit-of-measure-dialog';
import { UnitOfMeasureRow } from './unit-of-measure-row';
import { UnitOfMeasureSkeleton } from './unit-of-measure-skeleton';
import { useManageUnits } from './use-manage-units';

export function ManageUnitOfMeasureDialog({ trigger, onUnitAdded, open, onOpenChange }: { trigger?: React.ReactNode, onUnitAdded?: () => void, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;

  const { units, isLoading, handleAddUnit, handleUpdateUnit, handleDeleteUnit } = useManageUnits({ isOpen, onUnitAdded });

  const onAddUnit = async (name: string, abbreviation: string) => {
    const success = await handleAddUnit(name, abbreviation);
    if (success) {
      setIsOpen(false);
    }
  };

  const showTrigger = trigger !== null;
  const dialogTrigger = trigger || (
    <Button variant="outline">
      <ListTree className="mr-2 h-4 w-4" />
      Manage Units
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          {dialogTrigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage Units of Measure</DialogTitle>
          <DialogDescription>
            Add, edit, or delete your units of measure.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <div className="flex justify-end mb-4">
            <UnitOfMeasureDialog onSave={onAddUnit}>
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
                        onUpdate={handleUpdateUnit}
                        onDelete={handleDeleteUnit}
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
