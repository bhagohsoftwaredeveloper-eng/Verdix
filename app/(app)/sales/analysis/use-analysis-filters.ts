'use client';

import { useState } from 'react';
import { DateRange } from 'react-day-picker';

export function useAnalysisFilters() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [terminal, setTerminal] = useState<string>('all');
  const [interval, setInterval] = useState<string>('daily');
  const [paymentType, setPaymentType] = useState<string>('all');

  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
  const [tempTerminal, setTempTerminal] = useState<string>('all');
  const [tempInterval, setTempInterval] = useState<string>('daily');
  const [tempPaymentType, setTempPaymentType] = useState<string>('all');

  const hasActiveFilters = !!(
    dateRange || terminal !== 'all' || interval !== 'daily' || paymentType !== 'all'
  );

  const resetFilters = () => {
    setDateRange(undefined);
    setTerminal('all');
    setInterval('daily');
    setPaymentType('all');
  };

  const applyAdvancedFilters = () => {
    setTerminal(tempTerminal);
    setInterval(tempInterval);
    setPaymentType(tempPaymentType);
    setFilterDialogOpen(false);
  };

  return {
    dateRange, setDateRange,
    terminal, setTerminal,
    interval, setInterval,
    paymentType, setPaymentType,
    filterDialogOpen, setFilterDialogOpen,
    tempDateRange, setTempDateRange,
    tempTerminal, setTempTerminal,
    tempInterval, setTempInterval,
    tempPaymentType, setTempPaymentType,
    hasActiveFilters,
    resetFilters,
    applyAdvancedFilters,
  };
}
