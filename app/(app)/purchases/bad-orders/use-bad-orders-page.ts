'use client';

import { useState } from 'react';
import { useBadOrders, useBadOrderStats } from '@/hooks/use-api';

export function useBadOrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [pageSize, setPageSize] = useState(10);

  const { badOrders, loading, refetch, pagination } = useBadOrders(
    searchTerm,
    statusFilter || undefined,
    currentPage,
    pageSize,
  );

  const { stats } = useBadOrderStats();

  const handleSearch = () => {
    setSearchTerm(searchQuery);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSearchQuery('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  const hasActiveFilters = !!(searchTerm || statusFilter);

  return {
    // data
    badOrders,
    loading,
    refetch,
    pagination,
    stats,

    // state
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    currentPage, setCurrentPage,
    pageSize, setPageSize,
    viewingOrder, setViewingOrder,
    hasActiveFilters,

    // handlers
    handleSearch,
    resetFilters,
  };
}
