'use client';

import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import type { SupplierProductMapping, Supplier } from '@/lib/types';

import {
  deleteSupplierMapping,
  getSupplierMappings,
  getSuppliers,
  setPrimarySupplier,
} from '../actions';

export interface UseProductSuppliersProps {
  productId: string;
  onUpdate?: () => void;
}

/**
 * Controller for the product supplier mappings panel: loads mappings/suppliers
 * and owns the add/edit dialog state plus the delete and set-primary flows.
 */
export function useProductSuppliers({ productId, onUpdate }: UseProductSuppliersProps) {
  const [mappings, setMappings] = useState<SupplierProductMapping[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<SupplierProductMapping | null>(null);
  const [confirmPrimaryOpen, setConfirmPrimaryOpen] = useState(false);
  const [pendingPrimaryId, setPendingPrimaryId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [mappingsData, suppliersData] = await Promise.all([
        getSupplierMappings(productId),
        getSuppliers(),
      ]);
      setMappings(mappingsData);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Failed to load supplier data', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load supplier data.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [productId]);

  const handleOpenDialog = (mapping?: SupplierProductMapping) => {
    setEditingMapping(mapping ?? null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this supplier mapping?')) {
      try {
        const result = await deleteSupplierMapping(id);
        if (result.success) {
          toast({
            title: 'Removed',
            description: result.message,
          });
          loadData();
          onUpdate?.();
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: result.message,
          });
        }
      } catch (error) {
        console.error('Error deleting mapping:', error);
      }
    }
  };

  const initiateSetPrimary = (id: string) => {
    const mapping = mappings.find(m => m.id === id);
    if (!mapping) return;

    // Always prompt so the user re-validates the ROP/Lead Time before switching.
    setPendingPrimaryId(id);
    setConfirmPrimaryOpen(true);
  };

  const confirmSetPrimary = async () => {
    if (!pendingPrimaryId) return;

    try {
      const result = await setPrimarySupplier(productId, pendingPrimaryId);
      if (result.success) {
        toast({
          title: 'Primary Supplier Updated',
          description: 'The primary supplier and active ROP have been updated.',
        });
        loadData();
        onUpdate?.();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message,
        });
      }
    } catch (error) {
      console.error('Error setting primary:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update primary supplier.',
      });
    } finally {
      setConfirmPrimaryOpen(false);
      setPendingPrimaryId(null);
    }
  };

  return {
    mappings,
    suppliers,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    editingMapping,
    confirmPrimaryOpen,
    setConfirmPrimaryOpen,
    loadData,
    handleOpenDialog,
    handleDelete,
    initiateSetPrimary,
    confirmSetPrimary,
  };
}
