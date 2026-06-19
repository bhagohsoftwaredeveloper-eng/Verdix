'use client';

import { useProducts, useBusinessProfile } from '@/hooks/use-api';
import { printPurchaseOrder } from '../purchase-order-print-utils';
import { type ViewPurchaseOrderDialogProps } from './view-purchase-order-types';

export function useViewPurchaseOrder({ order }: Pick<ViewPurchaseOrderDialogProps, 'order'>) {
  const { products } = useProducts();
  const { profile } = useBusinessProfile();

  const handlePrint = () => {
    if (!order) return;
    printPurchaseOrder(order, profile, products);
  };

  return { products, profile, handlePrint };
}

export type ViewPurchaseOrderController = ReturnType<typeof useViewPurchaseOrder>;
