'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getApiUrl } from '@/lib/api-config';
import { usePrinter } from '@/lib/use-printer';
import { VoidSlipGenerator } from '@/lib/void-slip-generator';
import type { Sale } from '@/lib/types';
import type { VoidStep, PosSettings } from './void-sales-types';

type Options = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function useVoidSales({ isOpen, onOpenChange }: Options) {
  const [step, setStep] = useState<VoidStep>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [soNumber, setSoNumber] = useState('');
  const [searchError, setSearchError] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [posSettings, setPosSettings] = useState<PosSettings | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [isRecentLoading, setIsRecentLoading] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidError, setVoidError] = useState('');
  const authSucceededRef = useRef(false);
  const printMode = (posSettings?.printMode && posSettings.printMode !== 'none'
    ? posSettings.printMode
    : 'browser') as 'browser' | 'escpos' | 'usb' | 'native' | 'epson';
  const { print } = usePrinter(printMode, posSettings?.nativePrinterName);

  useEffect(() => {
    if (isOpen) {
      authSucceededRef.current = false;
      setStep('loading');
      setSoNumber('');
      setSearchError('');
      setSelectedSale(null);

      fetch(getApiUrl(`/pos-settings?_t=${Date.now()}`), { cache: 'no-store' })
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            const settings = result.data;
            setPosSettings(settings);
            if (settings.enableVoidReturnAuth) {
              setStep('auth');
            } else {
              setStep('input_so');
            }
          } else {
            setStep('input_so');
          }
        })
        .catch(() => setStep('input_so'));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && step === 'input_so') {
      setIsRecentLoading(true);
      fetch(getApiUrl(`/pos/recent-sales?_t=${Date.now()}`), { cache: 'no-store' })
        .then(res => res.json())
        .then(result => { if (result.success) setRecentSales(result.data || []); })
        .catch(() => {})
        .finally(() => setIsRecentLoading(false));
    }
  }, [isOpen, step]);

  const handlePickSale = useCallback((sale: Sale) => {
    setSelectedSale(sale);
    setSearchError('');
    setStep('select_items');
  }, []);

  const handleAuthSuccess = useCallback(() => {
    authSucceededRef.current = true;
    setStep('input_so');
  }, []);

  const handleAuthClose = useCallback((open: boolean) => {
    if (!open && !authSucceededRef.current) {
      onOpenChange(false);
    }
    authSucceededRef.current = false;
  }, [onOpenChange]);

  const handleSearchSO = useCallback(async () => {
    const term = soNumber.trim();
    if (!term) return;

    setIsLoading(true);
    setSearchError('');

    try {
      const response = await fetch(getApiUrl(`/pos/recent-sales?query=${encodeURIComponent(term)}`));
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        const found = result.data.find((s: any) => String(s.orderNumber) === term || s.id === term) || result.data[0];
        setSelectedSale(found);
        setStep('select_items');
      } else {
        setSearchError('Transaction not found. Please check the SO Number.');
      }
    } catch (err) {
      console.error('Search error', err);
      setSearchError('Error searching transaction.');
    } finally {
      setIsLoading(false);
    }
  }, [soNumber]);

  const handlePrintVoid = useCallback(async (saleData: any) => {
    try {
      if (!posSettings || posSettings.printMode === 'none') return;

      const generator = new VoidSlipGenerator();
      const buffer = generator.generateVoidSlip(saleData, posSettings as any);

      await print(buffer);
    } catch (error) {
      console.error('Error printing void slip:', error);
    }
  }, [posSettings, print]);

  const handleVoidTransaction = useCallback(async () => {
    if (!selectedSale) return;

    setIsVoiding(true);
    setVoidError('');

    try {
      const response = await fetch(getApiUrl('/pos/void-transaction'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleId: selectedSale.id }),
      });
      const result = await response.json();

      if (result.success) {
        await handlePrintVoid(selectedSale);

        setTimeout(() => {
          onOpenChange(false);
        }, 1000);
      } else {
        setVoidError(result.error || 'Failed to void transaction');
      }
    } catch (err) {
      console.error('Error voiding transaction', err);
      setVoidError('Error connecting to server');
    } finally {
      setIsVoiding(false);
    }
  }, [selectedSale, handlePrintVoid, onOpenChange]);

  const handleBackToSearch = useCallback(() => {
    setStep('input_so');
    setSelectedSale(null);
    setSoNumber('');
  }, []);

  return {
    step,
    setStep,
    isLoading,
    soNumber,
    setSoNumber,
    searchError,
    selectedSale,
    posSettings,
    recentSales,
    isRecentLoading,
    isVoiding,
    voidError,
    handlePickSale,
    handleAuthSuccess,
    handleAuthClose,
    handleSearchSO,
    handleVoidTransaction,
    handleBackToSearch,
  };
}
