'use client';

import { Loader2 } from 'lucide-react';

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
import type { UnitOfMeasure } from '@/lib/types';

import { useUnitOfMeasureForm, type UnitOfMeasureSaveHandler } from './use-unit-of-measure-form';

export function UnitOfMeasureDialog({
  unit,
  onSave,
  children,
  disabled,
}: {
  unit?: UnitOfMeasure;
  onSave: UnitOfMeasureSaveHandler;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { isOpen, setIsOpen, name, setName, abbreviation, setAbbreviation, isSaving, handleSave } =
    useUnitOfMeasureForm({ unit, onSave });

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
