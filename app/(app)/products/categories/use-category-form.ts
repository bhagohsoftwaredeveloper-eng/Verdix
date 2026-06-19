'use client';

import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import type { Category } from '@/lib/types';

export type CategorySaveHandler = (name: string, markupPercentage?: number) => Promise<void>;

export interface UseCategoryFormProps {
  category?: Category;
  onSave: CategorySaveHandler;
}

/**
 * Controller for the add/edit category dialog form: field state, reset-on-open,
 * and the validated save flow.
 */
export function useCategoryForm({ category, onSave }: UseCategoryFormProps) {
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

  return {
    isOpen,
    setIsOpen,
    name,
    setName,
    markupPercentage,
    setMarkupPercentage,
    isSaving,
    handleSave,
  };
}
