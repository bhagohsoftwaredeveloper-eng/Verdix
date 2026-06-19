'use client';

import { useState, useEffect } from 'react';
import { type BadItemInput, type ReceivePurchaseOrderDialogProps } from './receive-purchase-order-types';

export function useReceivePurchaseOrder({
  order,
  open,
  onOpenChange,
  onConfirm,
  requireConfirmation,
}: ReceivePurchaseOrderDialogProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [badItems, setBadItems] = useState<Record<string, BadItemInput>>({});
  const [expiryDates, setExpiryDates] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [allocationStrategy, setAllocationStrategy] = useState<'equal' | 'proportional'>('equal');

  useEffect(() => {
    if (!open || !order) return;

    setQuantities(
      order.items.reduce((acc, item) => {
        acc[item.productId] = item.quantity;
        return acc;
      }, {} as Record<string, number>),
    );

    setBadItems(
      order.items.reduce((acc, item) => {
        acc[item.productId] = { quantity: 0, reason: 'Damaged', description: '' };
        return acc;
      }, {} as Record<string, BadItemInput>),
    );

    setExpiryDates(
      order.items.reduce((acc, item) => {
        acc[item.productId] = '';
        return acc;
      }, {} as Record<string, string>),
    );
  }, [open, order]);

  // ---- field handlers ------------------------------------------------------

  const handleQuantityChange = (productId: string, value: string) => {
    const num = parseFloat(value);
    setQuantities((prev) => ({ ...prev, [productId]: isNaN(num) ? 0 : num }));
  };

  const handleExpiryDateChange = (productId: string, value: string) => {
    setExpiryDates((prev) => ({ ...prev, [productId]: value }));
  };

  const handleBadQtyChange = (productId: string, value: string) => {
    const num = parseFloat(value);
    setBadItems((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], quantity: isNaN(num) ? 0 : num },
    }));
  };

  const handleBadReasonChange = (productId: string, value: string) => {
    setBadItems((prev) => ({ ...prev, [productId]: { ...prev[productId], reason: value } }));
  };

  const handleBadDescriptionChange = (productId: string, value: string) => {
    setBadItems((prev) => ({ ...prev, [productId]: { ...prev[productId], description: value } }));
  };

  // ---- submit --------------------------------------------------------------

  const handleConfirm = async () => {
    if (requireConfirmation && !isConfirmOpen) {
      setIsConfirmOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const receivedItems = Object.entries(quantities).map(([productId, quantity]) => ({
        productId,
        quantity,
        expirationDate: expiryDates[productId] || undefined,
      }));

      const reportedBadItems = Object.entries(badItems)
        .filter(([, data]) => data.quantity > 0)
        .map(([productId, data]) => {
          const originalItem = order.items.find((i) => i.productId === productId);
          return {
            productId,
            productName: originalItem?.productName || 'Unknown Product',
            quantity: data.quantity,
            cost: originalItem?.cost || 0,
            reason: data.reason,
            description: data.description,
          };
        });

      await onConfirm(
        receivedItems,
        reportedBadItems.length > 0 ? reportedBadItems : undefined,
        allocationStrategy,
      );
      onOpenChange(false);
      setIsConfirmOpen(false);
    } catch (error) {
      console.error('Failed to confirm receipt:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasBadItems = Object.values(badItems).some((item) => item.quantity > 0);

  return {
    quantities,
    badItems,
    expiryDates,
    isSubmitting,
    isConfirmOpen, setIsConfirmOpen,
    allocationStrategy, setAllocationStrategy,
    hasBadItems,

    handleQuantityChange,
    handleExpiryDateChange,
    handleBadQtyChange,
    handleBadReasonChange,
    handleBadDescriptionChange,
    handleConfirm,
  };
}

export type ReceivePurchaseOrderController = ReturnType<typeof useReceivePurchaseOrder>;
