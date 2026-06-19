'use client';

import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import type { Supplier } from '@/lib/types';

import { getPaymentTerms } from '../actions';

export type SupplierSaveHandler = (data: any) => Promise<void>;

export interface UseSupplierFormProps {
  supplier?: Supplier;
  onSave: SupplierSaveHandler;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Controller for the add/edit supplier form dialog: owns the (optionally
 * controlled) open state, all the field state, payment-terms loading, prop
 * syncing, and the validated save flow.
 */
export function useSupplierForm({ supplier, onSave, open: controlledOpen, onOpenChange: setControlledOpen }: UseSupplierFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? setControlledOpen || (() => {}) : setInternalOpen;

  const [name, setName] = useState(supplier?.name || '');
  const [telephone, setTelephone] = useState(supplier?.telephone || '');
  const [mobilePhone, setMobilePhone] = useState(supplier?.mobilePhone || '');
  const [email, setEmail] = useState(supplier?.email || '');
  const [address, setAddress] = useState(supplier?.address || '');
  const [company, setCompany] = useState(supplier?.company || '');
  const [tin, setTin] = useState(supplier?.tin || '');
  const [paymentTerms, setPaymentTerms] = useState(supplier?.paymentTerms || 'CASH');
  const [orderSchedule, setOrderSchedule] = useState(supplier?.orderSchedule || '');

  const [availablePaymentTerms, setAvailablePaymentTerms] = useState<any[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadPaymentTerms = async () => {
      const terms = await getPaymentTerms();
      setAvailablePaymentTerms(terms);
    };
    loadPaymentTerms();
  }, []);

  // Sync state with supplier prop
  useEffect(() => {
    if (supplier) {
      setName(supplier.name || '');
      setTelephone(supplier.telephone || '');
      setMobilePhone(supplier.mobilePhone || '');
      setEmail(supplier.email || '');
      setAddress(supplier.address || '');
      setCompany(supplier.company || '');
      setTin(supplier.tin || '');
      setPaymentTerms(supplier.paymentTerms || 'CASH');
      setOrderSchedule(supplier.orderSchedule || '');
    } else {
      // Clear for adding
      setName('');
      setTelephone('');
      setMobilePhone('');
      setEmail('');
      setAddress('');
      setCompany('');
      setTin('');
      setPaymentTerms('CASH');
      setOrderSchedule('');
    }
  }, [supplier]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Supplier name is required.',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name,
        contactNumber: mobilePhone, // Map mobile to contactNumber for legacy compatibility if strict
        telephone,
        mobilePhone,
        email,
        address,
        company,
        tin,
        paymentTerms,
        orderSchedule,
      });
      toast({
        title: supplier ? 'Supplier Updated' : 'Supplier Added',
        description: `Supplier "${name}" has been successfully saved.`,
      });
      setIsOpen(false);
      if (!supplier) {
        setName('');
        setTelephone('');
        setMobilePhone('');
        setEmail('');
        setAddress('');
        setCompany('');
        setTin('');
        setPaymentTerms('CASH');
        setOrderSchedule('');
      }
    } catch (error) {
      console.error('Failed to save supplier', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save supplier. Please try again.',
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
    telephone,
    setTelephone,
    mobilePhone,
    setMobilePhone,
    email,
    setEmail,
    address,
    setAddress,
    company,
    setCompany,
    tin,
    setTin,
    paymentTerms,
    setPaymentTerms,
    orderSchedule,
    setOrderSchedule,
    availablePaymentTerms,
    isSaving,
    handleSave,
  };
}
