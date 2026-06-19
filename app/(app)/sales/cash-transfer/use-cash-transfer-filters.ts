'use client';

import { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';

export function useCashTransferFilters() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [terminalId, setTerminalId] = useState<string>('all');
  const [cashierId, setCashierId] = useState<string>('all');
  const [type, setType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, terminalId, cashierId, type, pageSize]);

  const handlePageChange = (page: number) => {
    if (page >= 1) setCurrentPage(page);
  };

  return {
    dateRange, setDateRange,
    terminalId, setTerminalId,
    cashierId, setCashierId,
    type, setType,
    currentPage, setCurrentPage,
    pageSize, setPageSize,
    handlePageChange,
  };
}
