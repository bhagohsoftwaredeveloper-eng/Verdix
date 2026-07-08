'use client';

import { useState } from 'react';
import type { Customer } from '@/lib/types';

const MOCK_CUSTOMERS: Customer[] = [
  { id: 'cust_1', name: 'Alice Johnson', contactNumber: '09171112233', paymentTerms: 'Net 30' },
  { id: 'cust_2', name: 'Bob Smith',     contactNumber: '09182223344', paymentTerms: 'Due on receipt' },
];

type Options = {
  onCustomersUpdated: () => void;
};

export function useManageCustomers({ onCustomersUpdated }: Options) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useState(() => {
    setIsLoading(true);
    setTimeout(() => { setCustomers(MOCK_CUSTOMERS); setIsLoading(false); }, 300);
  });

  const refreshCustomers = () => {
    onCustomersUpdated();
    setIsLoading(true);
    setTimeout(() => {
      setCustomers([...MOCK_CUSTOMERS, { id: 'cust_new', name: 'New Customer', contactNumber: '09123456789', paymentTerms: 'COD' }]);
      setIsLoading(false);
    }, 300);
  };

  const handleAddCustomer = async (name: string, contactNumber: string, paymentTerms: string) => {
    console.log('Mock add:', { name, contactNumber, paymentTerms });
    refreshCustomers();
  };

  return { customers, isLoading, isOpen, setIsOpen, refreshCustomers, handleAddCustomer };
}
