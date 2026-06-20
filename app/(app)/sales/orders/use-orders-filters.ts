'use client';

import { useState } from 'react';

const initialFilters = {
  status: '', startDate: '', endDate: '', salesPersonId: '', salesArea: '', customerId: '', reference: '',
};

const initialDialogOpen = {
  status: false, date: false, salesPerson: false, salesArea: false, customer: false, reference: false,
};

export type OrderFilters = typeof initialFilters;
export type OrderFilterDialogOpen = typeof initialDialogOpen;

export function useOrdersFilters() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<OrderFilters>(initialFilters);
  const [dialogOpen, setDialogOpen] = useState<OrderFilterDialogOpen>(initialDialogOpen);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const handleFilterChange = (key: keyof OrderFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => setFilters(initialFilters);

  const handlePageChange = (page: number, totalPages: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return {
    searchTerm, setSearchTerm,
    filters, handleFilterChange, clearFilters, activeFilterCount,
    dialogOpen, setDialogOpen,
    currentPage, setCurrentPage,
    limit, setLimit,
    handlePageChange,
  };
}
