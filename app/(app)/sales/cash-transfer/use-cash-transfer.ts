'use client';

import { useCashTransferFilters } from './use-cash-transfer-filters';
import { useCashTransferQuery } from './use-cash-transfer-query';
import { useCashTransferTable, formatCurrency } from './use-cash-transfer-table';

export { formatCurrency };

export function useCashTransfer() {
  const filters = useCashTransferFilters();

  const query = useCashTransferQuery({
    dateRange: filters.dateRange,
    terminalId: filters.terminalId,
    cashierId: filters.cashierId,
    type: filters.type,
    currentPage: filters.currentPage,
    pageSize: filters.pageSize,
  });

  const tableState = useCashTransferTable({
    transfers: query.transfers,
    totalPages: query.totalPages,
  });

  return {
    ...filters,
    ...query,
    ...tableState,
    formatCurrency,
  };
}
