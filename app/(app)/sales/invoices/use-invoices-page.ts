'use client';

import { useInvoicesFilters } from './use-invoices-filters';
import { useInvoicesQuery } from './use-invoices-query';
import { useInvoicesUtils } from './use-invoices-utils';
import { useInvoicesTable } from './use-invoices-table';

export function useInvoicesPage() {
  const filters = useInvoicesFilters();

  const { salesInvoices, loading, error, settings, voidMutation, invalidateInvoices } = useInvoicesQuery({
    setVoidDialogOpen: filters.setVoidDialogOpen,
  });

  const { uniqueSalesPersons, relevantSales, summaryTotals } = useInvoicesUtils({
    salesInvoices,
    searchQuery: filters.searchQuery,
    statusFilter: filters.statusFilter,
    dateRangeFilter: filters.dateRangeFilter,
    salesPersonFilter: filters.salesPersonFilter,
    customerFilter: filters.customerFilter,
    transactionSourceFilter: filters.transactionSourceFilter,
    referenceTypeFilter: filters.referenceTypeFilter,
    referenceNumberFilter: filters.referenceNumberFilter,
    receiptNumberFilter: filters.receiptNumberFilter,
  });

  const { table } = useInvoicesTable({
    relevantSales,
    expandedRows: filters.expandedRows,
    pagination: filters.pagination,
    setPagination: filters.setPagination,
    voidDialogOpen: filters.voidDialogOpen,
    setVoidDialogOpen: filters.setVoidDialogOpen,
    voidMutationPending: voidMutation.isPending,
    handlePrint: filters.handlePrint,
  });

  return {
    ...filters,
    salesInvoices,
    loading,
    error,
    settings,
    voidMutation,
    invalidateInvoices,
    uniqueSalesPersons,
    relevantSales,
    summaryTotals,
    table,
  };
}
