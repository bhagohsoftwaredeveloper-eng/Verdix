'use client';

import { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { getSupplierPayments } from '../actions';

interface PaginationState {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
}

export function useSupplierPayments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [paymentMethod, setPaymentMethod] = useState('All');
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    totalPages: 1,
    pageSize: 10,
    totalItems: 0,
  });

  const loadPayments = async () => {
    setLoading(true);
    try {
      const response = await getSupplierPayments({
        searchTerm,
        page: pagination.currentPage,
        limit: pagination.pageSize,
        from: dateRange?.from?.toISOString(),
        to: dateRange?.to?.toISOString(),
        paymentMethod,
      });
      if (response.success) {
        setPayments(response.data);
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            totalPages: response.pagination.totalPages,
            totalItems: response.pagination.total,
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadPayments, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, dateRange, paymentMethod, pagination.currentPage, pagination.pageSize]);

  const setPage = (page: number) => setPagination(prev => ({ ...prev, currentPage: page }));
  const setPageSize = (size: number) => setPagination(prev => ({ ...prev, pageSize: size, currentPage: 1 }));

  return {
    payments, loading,
    searchTerm, setSearchTerm,
    dateRange, setDateRange,
    paymentMethod, setPaymentMethod,
    pagination, setPage, setPageSize,
  };
}
