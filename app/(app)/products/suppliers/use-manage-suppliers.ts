'use client';

import { useEffect, useState } from 'react';

import type { Supplier } from '@/lib/types';

import { addSupplier, deleteSupplier, getSuppliers, updateSupplier } from '../actions';

export interface UseManageSuppliersProps {
  isOpen: boolean;
  onSupplierAdded?: () => void;
}

/**
 * Controller for the Manage Suppliers list: loads suppliers (on mount and on
 * open) and exposes the add/update/delete handlers.
 */
export function useManageSuppliers({ isOpen, onSupplierAdded }: UseManageSuppliersProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSuppliers = async () => {
    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSupplier = async (data: any) => {
    const result = await addSupplier(data);
    if (result.success) {
      await loadSuppliers();
      onSupplierAdded?.();
    }
  };

  const handleUpdateSupplier = async (supplierId: string, data: any) => {
    const result = await updateSupplier(supplierId, data);
    if (result.success) {
      await loadSuppliers();
      onSupplierAdded?.();
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      const result = await deleteSupplier(supplierId);
      if (result.success) {
        await loadSuppliers();
        onSupplierAdded?.();
      }
    }
  };

  // Load suppliers when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadSuppliers();
    }
  }, [isOpen]);

  // Initial load if generic usage
  useEffect(() => {
    loadSuppliers();
  }, []);

  return {
    suppliers,
    isLoading,
    handleAddSupplier,
    handleUpdateSupplier,
    handleDeleteSupplier,
  };
}
