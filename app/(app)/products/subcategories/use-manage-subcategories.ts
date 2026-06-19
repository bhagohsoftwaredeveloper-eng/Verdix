'use client';

import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import type { Category } from '@/lib/types';

import { addSubcategory, deleteSubcategory, getSubcategories, updateSubcategory } from '../actions';

export interface UseManageSubcategoriesProps {
  onSubcategoryAdded?: () => void;
}

/**
 * Controller for the Manage Subcategories list: loads subcategories and exposes
 * the add/update/delete handlers (data + toasts).
 */
export function useManageSubcategories({ onSubcategoryAdded }: UseManageSubcategoriesProps) {
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadSubcategories = async () => {
    const subs = await getSubcategories();
    setSubcategories(subs);
    setIsLoading(false);
  };

  useEffect(() => {
    loadSubcategories();
  }, []);

  const handleAddSubcategory = async (name: string) => {
    const result = await addSubcategory(name);
    if (result.success) {
      loadSubcategories();
      onSubcategoryAdded?.();
    }
  };

  const handleUpdateSubcategory = async (id: string, name: string) => {
    const result = await updateSubcategory(id, name);
    if (result.success) {
      toast({ title: 'Subcategory Updated', description: result.message });
      loadSubcategories();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };

  const handleDeleteSubcategory = async (id: string) => {
    const result = await deleteSubcategory(id);
    if (result.success) {
      toast({ title: 'Subcategory Deleted', description: result.message });
      loadSubcategories();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };

  return {
    subcategories,
    isLoading,
    handleAddSubcategory,
    handleUpdateSubcategory,
    handleDeleteSubcategory,
  };
}
