'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';
import type { XReadingData } from './x-reading-types';

export function useXReading() {
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [xReadingData, setXReadingData] = useState<XReadingData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsAuthDialogOpen(true);
  }, []);

  const loadXReadingData = async () => {
    setLoading(true);
    try {
      const settingsResponse = await fetch(getApiUrl('/pos-settings'));
      if (!settingsResponse.ok) throw new Error(`API error ${settingsResponse.status}`);
      const settingsResult = await settingsResponse.json();
      const settings = settingsResult.success ? settingsResult.data : {};

      const response = await fetch(getApiUrl('/sales/x-reading?shiftStatus=active&limit=1'));
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const result = await response.json();

      if (result.success && result.data.length > 0) {
        setXReadingData({
          ...result.data[0],
          businessName: settings.businessName,
          operatedBy: settings.operatedBy,
          address: settings.address,
          tin: settings.tin,
          contactNumber: settings.contactNumber,
          email: settings.email,
        });
      } else {
        toast({ title: 'No Active Shift', description: 'There is no active cashier shift to report on.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error loading X-reading data:', error);
      toast({ title: 'Error', description: 'Failed to load X-reading data.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminAuthSuccess = () => {
    setIsAuthDialogOpen(false);
    setShowReport(true);
    loadXReadingData();
  };

  const handlePrint = async () => {
    if (!xReadingData) return;
    try {
      const settingsResponse = await fetch(getApiUrl('/pos-settings'));
      if (!settingsResponse.ok) throw new Error(`API error ${settingsResponse.status}`);
      const settingsResult = await settingsResponse.json();
      const settings = settingsResult.success ? settingsResult.data : {};

      if (settings.printMode === 'escpos' || settings.printMode === 'usb') {
        const { XReadingGenerator } = await import('@/lib/x-reading-generator');
        const generator = new XReadingGenerator();
        const printData = { ...xReadingData, businessName: settings.businessName, operatedBy: settings.operatedBy, address: settings.address, tin: settings.tin, contactNumber: settings.contactNumber, email: settings.email };
        const uint8Array = generator.generate(printData);
        if ((window as any).electron) {
          await (window as any).electron.printThermal(uint8Array);
          toast({ title: 'X-Reading Printed', description: 'Thermal receipt has been sent to printer.' });
          return;
        }
      }
      window.print();
      toast({ title: 'X-Reading Printed', description: 'Cashier shift report has been printed.' });
    } catch (error) {
      console.error('Print error:', error);
      toast({ title: 'Print Error', description: 'Failed to print X-reading report.', variant: 'destructive' });
    }
  };

  return {
    isAuthDialogOpen, setIsAuthDialogOpen,
    showReport, setShowReport,
    xReadingData, loading,
    handleAdminAuthSuccess,
    loadXReadingData,
    handlePrint,
  };
}
