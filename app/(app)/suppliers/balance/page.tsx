'use client';

import { MakePaymentDialog } from '../payment-dialog/MakePaymentDialog';
import { SupplierTransactionDialog } from './supplier-transaction/SupplierTransactionDialog';
import { SupplierSummaryCards } from './SupplierSummaryCards';
import { SupplierBalanceTable } from './SupplierBalanceTable';
import { useSupplierBalance } from './use-supplier-balance';

export default function SupplierBalancePage() {
  const {
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
  } = useSupplierBalance();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Balance to Supplier</h2>
      </div>

      <SupplierSummaryCards
        totalPayable={totalPayable}
        overdueTotal={overdueTotal}
        awaitingCount={awaitingCount}
      />

      <SupplierBalanceTable
        suppliers={suppliers}
        paginatedSuppliers={paginatedSuppliers}
        loading={loading}
        searchTerm={searchTerm}
        filters={filters}
        currentPage={currentPage}
        pageSize={pageSize}
        onSearchChange={setSearchTerm}
        onFilterChange={setFilters}
        onResetFilters={() => setFilters({})}
        setCurrentPage={setCurrentPage}
        setPageSize={setPageSize}
        onViewTransactions={handleViewTransactions}
        onMakePayment={handleMakePayment}
      />

      {selectedSupplier && (
        <>
          <SupplierTransactionDialog
            supplierId={selectedSupplier.id}
            supplierName={selectedSupplier.name}
            open={isTransactionDialogOpen}
            onOpenChange={setIsTransactionDialogOpen}
          />
          <MakePaymentDialog
            supplier={selectedSupplier}
            open={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            onPaymentComplete={loadSuppliers}
          />
        </>
      )}
    </div>
  );
}
