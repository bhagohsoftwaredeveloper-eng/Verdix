'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCashTransfer } from './use-cash-transfer';
import { CashTransferSummaryCards } from './CashTransferSummaryCards';
import { CashTransferFilterBar } from './CashTransferFilterBar';
import { CashTransferTable } from './CashTransferTable';
import { CashTransferPagination } from './CashTransferPagination';

export default function CashTransferPage() {
  const {
    dateRange, setDateRange,
    terminalId, setTerminalId,
    cashierId, setCashierId,
    type, setType,
    currentPage, pageSize, setPageSize,
    handlePageChange,
    cashiers,
    transfers,
    summary,
    totalPages,
    totalCount,
    isLoading,
    refetch,
    table,
    formatCurrency,
  } = useCashTransfer();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">POS Cash Transfer</h2>
      </div>

      <CashTransferSummaryCards
        totalCashIn={summary.totalCashIn}
        totalCashOut={summary.totalCashOut}
        formatCurrency={formatCurrency}
      />

      <Card>
        <CardHeader>
          <CardTitle>Transfer History</CardTitle>
          <CardDescription>Records of all cash deposits and pickups.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <CashTransferFilterBar
              dateRange={dateRange}
              setDateRange={setDateRange}
              terminalId={terminalId}
              setTerminalId={setTerminalId}
              cashierId={cashierId}
              setCashierId={setCashierId}
              type={type}
              setType={setType}
              cashiers={cashiers}
              refetch={refetch}
              table={table}
            />

            <CashTransferTable table={table} isLoading={isLoading} />

            {!isLoading && transfers.length > 0 && (
              <CashTransferPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={(size) => { setPageSize(size); }}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
