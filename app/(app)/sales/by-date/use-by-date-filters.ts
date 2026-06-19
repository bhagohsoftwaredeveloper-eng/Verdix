'use client';

import { useState } from 'react';
import { DateRange } from 'react-day-picker';

export function useByDateFilters() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [terminal, setTerminal] = useState<string>('all');
  // eslint-disable-next-line no-shadow
  const [interval, setInterval] = useState<string>('daily');
  const [paymentType, setPaymentType] = useState<string>('all');
  const [transactionReference, setTransactionReference] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [tempTerminal, setTempTerminal] = useState<string>('all');
  const [tempInterval, setTempInterval] = useState<string>('daily');
  const [tempPaymentType, setTempPaymentType] = useState<string>('all');

  const hasActiveFilters = !!(
    dateRange || terminal !== 'all' || interval !== 'daily' || paymentType !== 'all' || searchTerm
  );

  const resetFilters = () => {
    setDateRange(undefined);
    setTerminal('all');
    setInterval('daily');
    setPaymentType('all');
    setTransactionReference('');
    setSearchTerm('');
    setCurrentPage(1);
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
    transactionReference, setTransactionReference,
    searchTerm, setSearchTerm,
    currentPage, setCurrentPage,
    limit, setLimit,
    filterDialogOpen, setFilterDialogOpen,
    tempTerminal, setTempTerminal,
    tempInterval, setTempInterval,
    tempPaymentType, setTempPaymentType,
    hasActiveFilters,
    resetFilters,
    applyAdvancedFilters,
  };
}
