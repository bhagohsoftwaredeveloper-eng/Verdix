'use client';

import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import type { UnitOfMeasure } from '@/lib/types';

import { addUnitOfMeasure, deleteUnitOfMeasure, getUnitsOfMeasure, updateUnitOfMeasure } from '../actions';

export interface UseManageUnitsProps {
  isOpen: boolean;
  onUnitAdded?: () => void;
}

/**
 * Controller for the Manage Units of Measure list: (re)loads units when the
 * dialog opens and exposes the add/update/delete handlers (data + toasts).
 */
export function useManageUnits({ isOpen, onUnitAdded }: UseManageUnitsProps) {
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

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

  /** Returns whether the add succeeded so the caller can close the dialog. */
  const handleAddUnit = async (name: string, abbreviation: string) => {
    const result = await addUnitOfMeasure(name, abbreviation);
    if (result.success) {
      await refreshUnits();
      onUnitAdded?.();
    }
    return result.success;
  };

  const handleUpdateUnit = async (id: string, name: string, abbreviation: string) => {
    const result = await updateUnitOfMeasure(id, name, abbreviation);
    if (result.success) {
      toast({ title: 'Unit Updated', description: result.message });
      await refreshUnits();
      onUnitAdded?.();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };

  const handleDeleteUnit = async (id: string) => {
    const result = await deleteUnitOfMeasure(id);
    if (result.success) {
      toast({ title: 'Unit Deleted', description: result.message });
      await refreshUnits();
      onUnitAdded?.();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };

  return {
    units,
    isLoading,
    handleAddUnit,
    handleUpdateUnit,
    handleDeleteUnit,
  };
}
