'use client';

import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/lib/types';

import { mockSerialNumbers } from './mock-serials';

/**
 * Controller for the Add Serial Number dialog: owns the open/mode/form state and
 * the single + batch add flows (with duplicate detection).
 */
export function useAddSerialForm({ product }: { product: Product }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serialNumber, setSerialNumber] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [baseSerial, setBaseSerial] = useState('');
  const [mode, setMode] = useState<'single' | 'batch'>('single');

  useEffect(() => {
    if (isOpen) {
      setMode('single');
      setSerialNumber('');
      setBaseSerial('');
      setQuantity(1);
    }
  }, [isOpen]);

  const handleAddBatchSerials = async () => {
    if (quantity <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid quantity.',
        description: 'Quantity must be greater than 0.',
      });
      return;
    }

    if (!baseSerial.trim()) {
      toast({
        variant: 'destructive',
        title: 'Base serial number cannot be empty.',
        description: 'Please provide a base serial number pattern.',
      });
      return;
    }

    // Check for potential duplicates
    const existingSerials = mockSerialNumbers.filter(s => s.productId === product.id).map(s => s.id);
    const newSerials = [];
    const duplicates = [];

    for (let i = 0; i < quantity; i++) {
      const serialId = `${baseSerial}-${String(i + 1).padStart(3, '0')}`;
      if (existingSerials.includes(serialId)) {
        duplicates.push(serialId);
      } else {
        newSerials.push(serialId);
      }
    }

    if (duplicates.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Duplicate serial numbers found.',
        description: `The following serial numbers already exist: ${duplicates.join(', ')}`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Mock add batch
      const addedSerials = newSerials.map(serialId => ({
        id: serialId,
        productId: product.id,
        status: 'In Stock' as const,
        dateAdded: new Date().toISOString(),
      }));

      mockSerialNumbers.push(...addedSerials);

      toast({
        title: 'Serial Numbers Added',
        description: `Added ${quantity} serial numbers starting with ${baseSerial}.`,
      });
      setBaseSerial('');
      setQuantity(1);
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error adding serial numbers:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to add serial numbers',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSingleSerial = async () => {
    if (!serialNumber.trim()) {
      toast({
        variant: 'destructive',
        title: 'Serial number cannot be empty.',
      });
      return;
    }

    // Check for duplicate
    if (mockSerialNumbers.some(s => s.id === serialNumber && s.productId === product.id)) {
      toast({
        variant: 'destructive',
        title: 'Serial number already exists.',
        description: `Serial "${serialNumber}" already exists for this product.`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Mock add
      mockSerialNumbers.push({
        id: serialNumber,
        productId: product.id,
        status: 'In Stock',
        dateAdded: new Date().toISOString(),
      });

      toast({
        title: 'Serial Number Added',
        description: `Serial "${serialNumber}" has been added.`,
      });
      setSerialNumber('');
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error adding serial number:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to add serial number',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isOpen,
    setIsOpen,
    isSubmitting,
    serialNumber,
    setSerialNumber,
    quantity,
    setQuantity,
    baseSerial,
    setBaseSerial,
    mode,
    setMode,
    handleAddBatchSerials,
    handleAddSingleSerial,
  };
}
