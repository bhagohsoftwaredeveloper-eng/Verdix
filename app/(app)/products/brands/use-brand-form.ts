'use client';

import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import type { Brand } from '@/lib/types';

export type BrandSaveHandler = (name: string, markupPercentage?: number) => Promise<void>;

export interface UseBrandFormProps {
  brand?: Brand;
  onSave: BrandSaveHandler;
}

/**
 * Controller for the add/edit brand dialog form: field state, reset-on-open,
 * and the validated save flow.
 */
export function useBrandForm({ brand, onSave }: UseBrandFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(brand?.name || '');
  const [markupPercentage, setMarkupPercentage] = useState(brand?.markupPercentage?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setName(brand?.name || '');
      setMarkupPercentage(brand?.markupPercentage?.toString() || '');
    }
  }, [isOpen, brand]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Brand name cannot be empty.',
      });
      return;
    }
    setIsSaving(true);
    try {
      await onSave(name, markupPercentage ? parseFloat(markupPercentage) : undefined);
      toast({
        title: brand ? 'Brand Updated' : 'Brand Added',
        description: `Brand "${name}" has been successfully saved.`,
      });
      setIsOpen(false);
      if (!brand) {
        setName('');
        setMarkupPercentage('');
      }
    } catch (error) {
      console.error('Failed to save brand', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save brand. Please try again.',
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
