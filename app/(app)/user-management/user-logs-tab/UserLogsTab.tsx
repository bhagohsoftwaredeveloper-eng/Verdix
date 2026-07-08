'use client';

import { UserLogsFilters } from './UserLogsFilters';
import { UserLogsTable } from './UserLogsTable';
import { useUserLogs } from './use-user-logs';

export function UserLogsTab() {
  const {
    logs, total, isLoading,
    currentPage, setCurrentPage,
    pageSize, setPageSize,
    searchQuery, setSearchQuery,
    moduleFilter, setModuleFilter,
    actionFilter, setActionFilter,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    totalPages, hasActiveFilters,
    fetchLogs, handleSearch, clearFilters,
  } = useUserLogs();

  return (
    <div className="space-y-4">
      <UserLogsFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        moduleFilter={moduleFilter}
        setModuleFilter={setModuleFilter}
        actionFilter={actionFilter}
        setActionFilter={setActionFilter}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        hasActiveFilters={hasActiveFilters}
        onSearch={handleSearch}
        onClear={clearFilters}
        onRefresh={fetchLogs}
        onPageReset={() => setCurrentPage(1)}
      />

      <UserLogsTable
        logs={logs}
        isLoading={isLoading}
        total={total}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        setPage={setCurrentPage}
        setPageSize={setPageSize}
      />
    </div>
  );
}
