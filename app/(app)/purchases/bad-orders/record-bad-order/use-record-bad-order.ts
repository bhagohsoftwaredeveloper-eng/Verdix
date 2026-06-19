'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { dispatchStockUpdate } from '@/hooks/use-live-refresh';
import { useToast } from '@/hooks/use-toast';
import { useSuppliers } from '@/hooks/use-api';
import { useUser } from '@/hooks/use-user';
import { Product } from '@/lib/types';
import { getApiUrl } from '@/lib/api-config';

import { badOrderSchema, type BadOrderFormValues } from './bad-order-schema';

export interface UseRecordBadOrderProps {
  onSuccess: () => void;
}

export function useRecordBadOrder({ onSuccess }: UseRecordBadOrderProps) {
  const { user } = useUser();
  const { toast } = useToast();
  const { suppliers } = useSuppliers();

  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [posSettings, setPosSettings] = useState<any>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [shelfLocations, setShelfLocations] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  // ---- form ----------------------------------------------------------------

  const form = useForm<BadOrderFormValues>({
    resolver: zodResolver(badOrderSchema),
    defaultValues: {
      reportedBy: '',
      supplierId: null,
      supplierName: null,
      notes: '',
      items: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // ---- data loading --------------------------------------------------------

  const loadLocations = async () => {
    try {
      const [whRes, slRes] = await Promise.all([
        fetch(getApiUrl('/warehouses')).then((r) => r.json()),
        fetch(getApiUrl('/shelf-locations')).then((r) => r.json()),
      ]);
      if (whRes.success) setWarehouses(whRes.data || []);
      if (slRes.success) setShelfLocations(slRes.data || []);
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  const loadPosSettings = async () => {
    try {
      const response = await fetch(getApiUrl('/pos-settings'));
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const result = await response.json();
      if (result.success) setPosSettings(result.data);
    } catch (error) {
      console.error('Failed to load POS settings:', error);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadPosSettings();
    loadLocations();
    if (user?.email && !form.getValues('reportedBy')) {
      form.setValue('reportedBy', user.email);
    }
  }, [open, user, form]);

  // ---- total calculation ---------------------------------------------------

  const calculateTotal = (items: any[]) => {
    const subtotal = (items || []).reduce((acc, item: any) => {
      return acc + (parseFloat(item?.cost) || 0) * (parseFloat(item?.quantity) || 0);
    }, 0);
    setTotal(subtotal);
  };

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith('items')) calculateTotal(value.items || []);
    });
    calculateTotal(form.getValues('items') || []);
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // ---- product actions -----------------------------------------------------

  function handleAddProduct(product: Product) {
    const existingIndex = fields.findIndex((f) => f.productId === product.id);
    if (existingIndex !== -1) {
      const existing = fields[existingIndex];
      update(existingIndex, { ...existing, quantity: existing.quantity + 1 });
    } else {
      append({
        productId: product.id,
        productName: product.name,
        quantity: 1,
        cost: product.cost || 0,
        reason: 'Damaged',
        description: '',
        barcode: product.barcode || '',
        currentStock: product.stock || 0,
      });
    }
  }

  // ---- submit --------------------------------------------------------------

  async function onSubmit(values: BadOrderFormValues) {
    if (posSettings?.requireBadOrderConfirmation) {
      setIsConfirmOpen(true);
    } else {
      processSubmit(values);
    }
  }

  async function handleFinalSubmit() {
    form.handleSubmit(processSubmit)();
  }

  async function processSubmit(values: BadOrderFormValues) {
    setIsSubmitting(true);
    setIsConfirmOpen(false);

    try {
      const formattedItems = values.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        cost: item.cost,
        reason: item.reason,
        description: item.description,
      }));

      const response = await fetch(getApiUrl('/bad-orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseOrderId: null,
          supplierId: values.supplierId,
          supplierName: values.supplierName,
          reportedBy: values.reportedBy,
          reportDate: new Date().toISOString(),
          items: formattedItems,
          notes: values.notes,
          totalAffectedValue: total,
          warehouseId: values.warehouseId,
          warehouseName: warehouses.find((w) => w.id === values.warehouseId)?.name,
          shelfId: values.shelfId,
          shelfName: shelfLocations.find((s) => s.id === values.shelfId)?.name,
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to create bad order');

      toast({ title: 'Bad Order Recorded', description: 'The bad order has been recorded successfully.' });

      form.reset();
      setOpen(false);
      onSuccess();
      dispatchStockUpdate();
    } catch (error) {
      console.error('Failed to create bad order:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record bad order.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) form.reset();
  };

  return {
    // dialog state
    open, handleOpenChange,
    isSubmitting,
    isConfirmOpen, setIsConfirmOpen,

    // form
    form,
    fields, append, remove,

    // data
    suppliers,
    warehouses,
    shelfLocations,
    total,

    // handlers
    handleAddProduct,
    handleFinalSubmit,
    onSubmit,
  };
}

export type RecordBadOrderController = ReturnType<typeof useRecordBadOrder>;
