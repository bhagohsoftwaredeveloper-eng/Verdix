'use client';

import { useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import type { UnitOfMeasure } from '@/lib/types';

export type UnitOfMeasureSaveHandler = (name: string, abbreviation: string) => Promise<void>;

export interface UseUnitOfMeasureFormProps {
  unit?: UnitOfMeasure;
  onSave: UnitOfMeasureSaveHandler;
}

/**
 * Controller for the add/edit unit of measure dialog form: field state and the
 * validated save flow.
 */
export function useUnitOfMeasureForm({ unit, onSave }: UseUnitOfMeasureFormProps) {
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

  return {
    isOpen,
    setIsOpen,
    name,
    setName,
    abbreviation,
    setAbbreviation,
    isSaving,
    handleSave,
  };
}
