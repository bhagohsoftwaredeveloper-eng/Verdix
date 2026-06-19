'use client';

import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/use-toast';

import { addDepartment, deleteDepartment, getDepartments, updateDepartment } from '../actions';
import type { Department } from './use-department-form';

export interface UseManageDepartmentsProps {
  isOpen: boolean;
  onDepartmentAdded?: () => void;
}

/**
 * Controller for the Manage Departments list: (re)loads departments whenever
 * the dialog opens and exposes the add/update/delete handlers (data + toasts).
 */
export function useManageDepartments({ isOpen, onDepartmentAdded }: UseManageDepartmentsProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const refreshDepartments = async () => {
    try {
      const loadedDepartments = await getDepartments();
      setDepartments(loadedDepartments);
    } catch (error) {
      console.error('Error loading departments', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshDepartments();
    }
  }, [isOpen]);

  const handleAddDepartment = async (name: string, markupPercentage?: number) => {
    const result = await addDepartment(name, markupPercentage);
    if (result.success) {
      await refreshDepartments();
      onDepartmentAdded?.();
    }
  };

  const handleUpdateDepartment = async (id: string, name: string, markupPercentage?: number) => {
    const result = await updateDepartment(id, name, markupPercentage);
    if (result.success) {
      toast({ title: 'Department Updated', description: result.message });
      await refreshDepartments();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    const result = await deleteDepartment(id);
    if (result.success) {
      toast({ title: 'Department Deleted', description: result.message });
      await refreshDepartments();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };

  return {
    departments,
    isLoading,
    handleAddDepartment,
    handleUpdateDepartment,
    handleDeleteDepartment,
  };
}
