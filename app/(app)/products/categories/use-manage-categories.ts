'use client';

import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import type { Category } from '@/lib/types';

import { addCategory, deleteCategory, getCategories, updateCategory } from '../actions';

export interface UseManageCategoriesProps {
  onCategoryAdded?: () => void;
}

/**
 * Controller for the Manage Categories list: loads categories and exposes the
 * add/update/delete handlers (data + toasts).
 */
export function useManageCategories({ onCategoryAdded }: UseManageCategoriesProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const refreshCategories = async () => {
    try {
      const loadedCategories = await getCategories();
      setCategories(loadedCategories);
    } catch (error) {
      console.error('Error loading categories', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshCategories();
  }, []);

  const handleAddCategory = async (name: string, markupPercentage?: number) => {
    const result = await addCategory(name, markupPercentage);
    if (result.success) {
      await refreshCategories();
      onCategoryAdded?.();
    }
  };

  const handleUpdateCategory = async (id: string, name: string, markupPercentage?: number) => {
    const result = await updateCategory(id, name, markupPercentage);
    if (result.success) {
      toast({ title: 'Category Updated', description: result.message });
      await refreshCategories();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const result = await deleteCategory(id);
    if (result.success) {
      toast({ title: 'Category Deleted', description: result.message });
      await refreshCategories();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };

  return {
    categories,
    isLoading,
    handleAddCategory,
    handleUpdateCategory,
    handleDeleteCategory,
  };
}
