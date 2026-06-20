'use client';

import { useState, useEffect } from 'react';
import { getSuppliersWithBalance, SupplierWithBalance, SupplierFilters } from '../actions';
import { differenceInDays } from 'date-fns';

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
    .filter(s => s.oldestInvoiceDate && differenceInDays(new Date(), new Date(s.oldestInvoiceDate)) >= 30)
    .reduce((acc, s) => acc + s.balance, 0);

  const awaitingCount = suppliers.filter(s => s.balance > 0).length;

  const handleViewTransactions = (supplier: SupplierWithBalance) => {
    setSelectedSupplier(supplier);
    setIsTransactionDialogOpen(true);
  };

  const handleMakePayment = (supplier: SupplierWithBalance) => {
    setSelectedSupplier(supplier);
    setIsPaymentDialogOpen(true);
  };

  return {
    suppliers, paginatedSuppliers, loading,
    searchTerm, setSearchTerm,
    filters, setFilters,
    currentPage, setCurrentPage,
    pageSize, setPageSize,
    totalPayable, overdueTotal, awaitingCount,
    selectedSupplier,
    isTransactionDialogOpen, setIsTransactionDialogOpen,
    isPaymentDialogOpen, setIsPaymentDialogOpen,
    handleViewTransactions, handleMakePayment,
    loadSuppliers,
  };
}
