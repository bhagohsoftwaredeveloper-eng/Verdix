'use client';

import { useState } from 'react';
import { DateRange } from 'react-day-picker';

export function useByProductFilters() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [terminal, setTerminal] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [cashierFilter, setCashierFilter] = useState<string>('all');
  const [referenceFilter, setReferenceFilter] = useState<string>('');

  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [dateRangeDialogOpen, setDateRangeDialogOpen] = useState(false);
  const [terminalDialogOpen, setTerminalDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [cashierDialogOpen, setCashierDialogOpen] = useState(false);
  const [referenceDialogOpen, setReferenceDialogOpen] = useState(false);

  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
  const [tempTerminal, setTempTerminal] = useState<string>('all');
  const [tempCategory, setTempCategory] = useState<string>('all');
  const [tempBrand, setTempBrand] = useState<string>('all');
  const [tempCashier, setTempCashier] = useState<string>('all');
  const [tempReference, setTempReference] = useState<string>('');

  const activeFilterCount = [
    !!dateRange,
    terminal !== 'all',
    categoryFilter !== 'all',
    brandFilter !== 'all',
    cashierFilter !== 'all',
    !!referenceFilter,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setSearchTerm('');
    setDateRange(undefined);
    setTerminal('all');
    setCategoryFilter('all');
    setBrandFilter('all');
    setCashierFilter('all');
    setReferenceFilter('');
    setCurrentPage(1);
  };

  const applyDateRange = () => { setDateRange(tempDateRange); setDateRangeDialogOpen(false); };
  const applyTerminal = () => { setTerminal(tempTerminal); setTerminalDialogOpen(false); };
  const applyCategory = () => { setCategoryFilter(tempCategory); setCategoryDialogOpen(false); };
  const applyBrand = () => { setBrandFilter(tempBrand); setBrandDialogOpen(false); };
  const applyCashier = () => { setCashierFilter(tempCashier); setCashierDialogOpen(false); };
  const applyReference = () => { setReferenceFilter(tempReference); setReferenceDialogOpen(false); };

  return {
    searchTerm, setSearchTerm,
    dateRange, setDateRange,
    terminal, setTerminal,
    categoryFilter, setCategoryFilter,
    brandFilter, setBrandFilter,
    cashierFilter, setCashierFilter,
    referenceFilter, setReferenceFilter,
    currentPage, setCurrentPage,
    limit, setLimit,
    dateRangeDialogOpen, setDateRangeDialogOpen,
    terminalDialogOpen, setTerminalDialogOpen,
    categoryDialogOpen, setCategoryDialogOpen,
    brandDialogOpen, setBrandDialogOpen,
    cashierDialogOpen, setCashierDialogOpen,
    referenceDialogOpen, setReferenceDialogOpen,
    tempDateRange, setTempDateRange,
    tempTerminal, setTempTerminal,
    tempCategory, setTempCategory,
    tempBrand, setTempBrand,
    tempCashier, setTempCashier,
    tempReference, setTempReference,
    activeFilterCount,
    resetFilters,
    applyDateRange,
    applyTerminal,
    applyCategory,
    applyBrand,
    applyCashier,
    applyReference,
  };
}
