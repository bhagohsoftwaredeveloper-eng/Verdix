'use client';

import { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import type { Sale } from '@/lib/types';
import { PaginationState } from '@tanstack/react-table';

export function useInvoicesFilters() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRange | undefined>(undefined);
  const [salesPersonFilter, setSalesPersonFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [transactionSourceFilter, setTransactionSourceFilter] = useState<string>('all');
  const [referenceTypeFilter, setReferenceTypeFilter] = useState<string>('all');
  const [referenceNumberFilter, setReferenceNumberFilter] = useState<string>('');
  const [receiptNumberFilter, setReceiptNumberFilter] = useState<string>('');

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [voidDialogOpen, setVoidDialogOpen] = useState<string | null>(null);
  const [invoiceToPrint, setInvoiceToPrint] = useState<Sale | null>(null);
  const [printTitle, setPrintTitle] = useState<string>('Sales Invoice');

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  // Dialog open states
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [dateRangeDialogOpen, setDateRangeDialogOpen] = useState(false);
  const [salesPersonDialogOpen, setSalesPersonDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [transactionSourceDialogOpen, setTransactionSourceDialogOpen] = useState(false);
  const [referenceTypeDialogOpen, setReferenceTypeDialogOpen] = useState(false);
  const [referenceNumberDialogOpen, setReferenceNumberDialogOpen] = useState(false);
  const [receiptNumberDialogOpen, setReceiptNumberDialogOpen] = useState(false);

  // Temp states
  const [tempStatus, setTempStatus] = useState<string>('all');
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
  const [tempSalesPerson, setTempSalesPerson] = useState<string>('all');
  const [tempCustomer, setTempCustomer] = useState<string>('');
  const [tempTransactionSource, setTempTransactionSource] = useState<string>('all');
  const [tempReferenceType, setTempReferenceType] = useState<string>('all');
  const [tempReferenceNumber, setTempReferenceNumber] = useState<string>('');
  const [tempReceiptNumber, setTempReceiptNumber] = useState<string>('');

  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }, [
    statusFilter, dateRangeFilter, salesPersonFilter, customerFilter,
    transactionSourceFilter, referenceTypeFilter, referenceNumberFilter,
    receiptNumberFilter, searchQuery,
  ]);

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handlePrint = (sale: Sale, title: string = 'Sales Invoice') => {
    setInvoiceToPrint(sale);
    setPrintTitle(title);
  };

  const hasActiveFilters = !!(
    statusFilter !== 'all' || dateRangeFilter || salesPersonFilter !== 'all' ||
    customerFilter || transactionSourceFilter !== 'all' || referenceTypeFilter !== 'all' ||
    referenceNumberFilter || receiptNumberFilter
  );

  const resetFilters = () => {
    setStatusFilter('all'); setDateRangeFilter(undefined); setSalesPersonFilter('all');
    setCustomerFilter(''); setTransactionSourceFilter('all'); setReferenceTypeFilter('all');
    setReferenceNumberFilter(''); setReceiptNumberFilter(''); setSearchQuery('');
  };

  const applyStatus = () => { setStatusFilter(tempStatus); setStatusDialogOpen(false); };
  const applyDateRange = () => { setDateRangeFilter(tempDateRange); setDateRangeDialogOpen(false); };
  const applySalesPerson = () => { setSalesPersonFilter(tempSalesPerson); setSalesPersonDialogOpen(false); };
  const applyCustomer = () => { setCustomerFilter(tempCustomer); setCustomerDialogOpen(false); };
  const applyTransactionSource = () => { setTransactionSourceFilter(tempTransactionSource); setTransactionSourceDialogOpen(false); };
  const applyReferenceType = () => { setReferenceTypeFilter(tempReferenceType); setReferenceTypeDialogOpen(false); };
  const applyReferenceNumber = () => { setReferenceNumberFilter(tempReferenceNumber); setReferenceNumberDialogOpen(false); };
  const applyReceiptNumber = () => { setReceiptNumberFilter(tempReceiptNumber); setReceiptNumberDialogOpen(false); };

  return {
    searchQuery, setSearchQuery,
    statusFilter, dateRangeFilter, salesPersonFilter, customerFilter,
    transactionSourceFilter, referenceTypeFilter, referenceNumberFilter, receiptNumberFilter,
    expandedRows, toggleRowExpansion,
    voidDialogOpen, setVoidDialogOpen,
    invoiceToPrint, setInvoiceToPrint, printTitle, handlePrint,
    pagination, setPagination,
    statusDialogOpen, setStatusDialogOpen,
    dateRangeDialogOpen, setDateRangeDialogOpen,
    salesPersonDialogOpen, setSalesPersonDialogOpen,
    customerDialogOpen, setCustomerDialogOpen,
    transactionSourceDialogOpen, setTransactionSourceDialogOpen,
    referenceTypeDialogOpen, setReferenceTypeDialogOpen,
    referenceNumberDialogOpen, setReferenceNumberDialogOpen,
    receiptNumberDialogOpen, setReceiptNumberDialogOpen,
    tempStatus, setTempStatus,
    tempDateRange, setTempDateRange,
    tempSalesPerson, setTempSalesPerson,
    tempCustomer, setTempCustomer,
    tempTransactionSource, setTempTransactionSource,
    tempReferenceType, setTempReferenceType,
    tempReferenceNumber, setTempReferenceNumber,
    tempReceiptNumber, setTempReceiptNumber,
    hasActiveFilters, resetFilters,
    applyStatus, applyDateRange, applySalesPerson, applyCustomer,
    applyTransactionSource, applyReferenceType, applyReferenceNumber, applyReceiptNumber,
  };
}
