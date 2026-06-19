'use client';

import { useState } from 'react';
import { useAddInvoiceData } from './use-add-invoice-data';
import { useAddInvoiceForm } from './use-add-invoice-form';

export function useAddInvoice({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const onClose = () => setIsOpen(false);

  const data = useAddInvoiceData({ isOpen });
  const formHook = useAddInvoiceForm({ paymentMethods: data.paymentMethods, onClose, onSuccess });

  return {
    isOpen, setIsOpen,
    ...data,
    ...formHook,
  };
}
