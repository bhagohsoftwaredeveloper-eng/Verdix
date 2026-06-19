'use client';

import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/use-toast';

export type Department = {
  id: string;
  name: string;
  markupPercentage?: number;
  created_at?: string;
  updated_at?: string;
};

export type DepartmentSaveHandler = (name: string, markupPercentage?: number) => Promise<void>;

export interface UseDepartmentFormProps {
  department?: Department;
  onSave: DepartmentSaveHandler;
}

/**
 * Controller for the add/edit department dialog form: field state,
 * reset-on-open, and the validated save flow.
 */
export function useDepartmentForm({ department, onSave }: UseDepartmentFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(department?.name || '');
  const [markupPercentage, setMarkupPercentage] = useState(department?.markupPercentage?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setName(department?.name || '');
      setMarkupPercentage(department?.markupPercentage?.toString() || '');
    }
  }, [isOpen, department]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Department name cannot be empty.',
      });
      return;
    }
    setIsSaving(true);
    try {
      await onSave(name, markupPercentage ? parseFloat(markupPercentage) : undefined);
      toast({
        title: department ? 'Department Updated' : 'Department Added',
        description: `Department "${name}" has been successfully saved.`,
      });
      setIsOpen(false);
      if (!department) {
        setName('');
        setMarkupPercentage('');
      }
    } catch (error) {
      console.error('Failed to save department', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save department. Please try again.',
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
