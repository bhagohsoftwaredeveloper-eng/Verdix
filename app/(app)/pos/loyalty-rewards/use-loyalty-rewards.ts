'use client';

import type { Customer } from '@/lib/types';

export function useLoyaltyRewards(customer: Customer | null) {
  const customerData = customer && customer.id !== 'walk-in'
    ? { ...customer, loyaltyPoints: customer.loyaltyPoints || 0 }
    : null;

  return { customerData };
}
