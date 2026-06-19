'use client';

import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import type { Brand } from '@/lib/types';

import { addBrand, deleteBrand, getBrands, updateBrand } from '../actions';

export interface UseManageBrandsProps {
  onBrandAdded?: () => void;
}

/**
 * Controller for the Manage Brands list: loads brands and exposes the
 * add/update/delete handlers (data + toasts).
 */
export function useManageBrands({ onBrandAdded }: UseManageBrandsProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const refreshBrands = async () => {
    try {
      const loadedBrands = await getBrands();
      setBrands(loadedBrands);
    } catch (error) {
      console.error('Error loading brands', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshBrands();
  }, []);

  const handleAddBrand = async (name: string, markupPercentage?: number) => {
    const result = await addBrand(name, markupPercentage);
    if (result.success) {
      await refreshBrands();
      onBrandAdded?.();
    }
  };

  const handleUpdateBrand = async (id: string, name: string, markupPercentage?: number) => {
    const result = await updateBrand(id, name, markupPercentage);
    if (result.success) {
      toast({ title: 'Brand Updated', description: result.message });
      await refreshBrands();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };

  const handleDeleteBrand = async (id: string) => {
    const result = await deleteBrand(id);
    if (result.success) {
      toast({ title: 'Brand Deleted', description: result.message });
      await refreshBrands();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };

  return {
    brands,
    isLoading,
    handleAddBrand,
    handleUpdateBrand,
    handleDeleteBrand,
  };
}
