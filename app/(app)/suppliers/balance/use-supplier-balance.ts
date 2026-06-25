'use client';

import { useState, useEffect } from 'react';
import { getSuppliersWithBalance, SupplierWithBalance, SupplierFilters } from '../actions';

export type AgingBuckets = {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
};

export function useSupplierBalance() {
  const [suppliers, setSuppliers] = useState<SupplierWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<SupplierFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierWithBalance | null>(null);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isCreditMemoDialogOpen, setIsCreditMemoDialogOpen] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkPaymentOpen, setIsBulkPaymentOpen] = useState(false);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await getSuppliersWithBalance(searchTerm, filters);
      setSuppliers(data.sort((a, b) => b.balance - a.balance));
    } catch (e) {
      console.error('Failed to load suppliers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    loadSuppliers();
  }, [searchTerm, filters]);

  const paginatedSuppliers = suppliers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const totalPayable = suppliers.reduce((acc, s) => acc + s.balance, 0);

  const overdueTotal = suppliers
    .filter(s => s.balance > 0 && s.daysOverdue !== undefined && s.daysOverdue > 0)
    .reduce((acc, s) => acc + s.balance, 0);

  const awaitingCount = suppliers.filter(s => s.balance > 0).length;

  const agingBuckets: AgingBuckets = {
    current:    suppliers.filter(s => s.balance > 0 && (s.agingBucket === 'current' || !s.agingBucket)).reduce((a, s) => a + s.balance, 0),
    days1to30:  suppliers.filter(s => s.agingBucket === '1-30').reduce((a, s) => a + s.balance, 0),
    days31to60: suppliers.filter(s => s.agingBucket === '31-60').reduce((a, s) => a + s.balance, 0),
    days61to90: suppliers.filter(s => s.agingBucket === '61-90').reduce((a, s) => a + s.balance, 0),
    days90plus: suppliers.filter(s => s.agingBucket === '90+').reduce((a, s) => a + s.balance, 0),
  };

  // Selection helpers
  const payableSuppliers = paginatedSuppliers.filter(s => s.balance > 0);
  const allPageSelected = payableSuppliers.length > 0 && payableSuppliers.every(s => selectedIds.has(s.id));
  const somePageSelected = payableSuppliers.some(s => selectedIds.has(s.id));

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        payableSuppliers.forEach(s => next.add(s.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        payableSuppliers.forEach(s => next.delete(s.id));
        return next;
      });
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedSuppliers = suppliers.filter(s => selectedIds.has(s.id));

  const handleViewTransactions = (supplier: SupplierWithBalance) => {
    setSelectedSupplier(supplier);
    setIsTransactionDialogOpen(true);
  };

  const handleMakePayment = (supplier: SupplierWithBalance) => {
    setSelectedSupplier(supplier);
    setIsPaymentDialogOpen(true);
  };

  const handleRecordReturn = (supplier: SupplierWithBalance) => {
    setSelectedSupplier(supplier);
    setIsCreditMemoDialogOpen(true);
  };

  const handleBulkPayment = () => setIsBulkPaymentOpen(true);

  return {
    suppliers, paginatedSuppliers, loading,
    searchTerm, setSearchTerm,
    filters, setFilters,
    currentPage, setCurrentPage,
    pageSize, setPageSize,
    totalPayable, overdueTotal, awaitingCount, agingBuckets,
    selectedSupplier,
    isTransactionDialogOpen, setIsTransactionDialogOpen,
    isPaymentDialogOpen, setIsPaymentDialogOpen,
    isCreditMemoDialogOpen, setIsCreditMemoDialogOpen,
    handleViewTransactions, handleMakePayment, handleRecordReturn,
    loadSuppliers,
    // Bulk selection
    selectedIds, selectedSuppliers,
    allPageSelected, somePageSelected,
    handleToggleSelect, handleSelectAll, clearSelection,
    isBulkPaymentOpen, setIsBulkPaymentOpen, handleBulkPayment,
  };
}
