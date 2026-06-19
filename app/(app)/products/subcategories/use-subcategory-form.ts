'use client';

import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import type { Category } from '@/lib/types';

export type SubcategorySaveHandler = (name: string) => Promise<void>;

export interface UseSubcategoryFormProps {
  subcategory?: Category;
  onSave: SubcategorySaveHandler;
}

/**
 * Controller for the add/edit subcategory dialog form: name state,
 * reset-on-open, and the validated save flow.
 */
export function useSubcategoryForm({ subcategory, onSave }: UseSubcategoryFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(subcategory?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setName(subcategory?.name || '');
    }
  }, [isOpen, subcategory]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Subcategory name cannot be empty.',
      });
      return;
    }
    setIsSaving(true);
    try {
      await onSave(name);
      toast({
        title: subcategory ? 'Subcategory Updated' : 'Subcategory Added',
        description: `Subcategory "${name}" has been successfully saved.`,
      });
      setIsOpen(false);
      if (!subcategory) setName('');
    } catch (error) {
      console.error('Failed to save subcategory', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save subcategory. Please try again.',
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
    isSaving,
    handleSave,
  };
}
