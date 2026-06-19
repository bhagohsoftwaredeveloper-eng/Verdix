'use client';

import { useState } from 'react';
import { getApiUrl } from '@/lib/api-config';

type Props = { onCustomerAdded?: () => void };

export function useCustomerSelection({ onCustomerAdded }: Props = {}) {
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleAddCustomer = async (
    customerId: string,
    name: string,
    contactNumber: string,
    active: boolean,
    loyaltyPoints: number,
    paymentTerms: string,
    address: string,
    billingAddress: string,
    discount: number,
    creditLimit: number,
    priceLevelId?: string
  ) => {
    const response = await fetch(getApiUrl('/customers'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId, name, contactNumber, active,
        loyaltyPoints, paymentTerms, address,
        billingAddress, discount, creditLimit, priceLevelId,
      }),
    });

    if (!response.ok) throw new Error('Failed to add customer');
    onCustomerAdded?.();
  };

  return { showAddDialog, setShowAddDialog, handleAddCustomer };
}
