'use client';

import { Pencil, Trash2 } from 'lucide-react';

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
} from '@/components/ui/alert-dialog';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { UnitOfMeasure } from '@/lib/types';

import { UnitOfMeasureDialog } from './unit-of-measure-dialog';

export function UnitOfMeasureRow({
  unit,
  onUpdate,
  onDelete,
}: {
  unit: UnitOfMeasure;
  onUpdate: (id: string, name: string, abbreviation: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{unit.name}</TableCell>
      <TableCell>{unit.abbreviation}</TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <UnitOfMeasureDialog unit={unit} onSave={(name, abbreviation) => onUpdate(unit.id, name, abbreviation)}>
            <Button variant="ghost" size="icon" title="Edit Unit">
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
          </UnitOfMeasureDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete Unit">
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the unit of measure "{unit.name}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(unit.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
