'use client';

import { MakePaymentDialog } from '../payment-dialog/MakePaymentDialog';
import { SupplierTransactionDialog } from './supplier-transaction/SupplierTransactionDialog';
import { CreditMemoDialog } from '../credit-memo/CreditMemoDialog';
import { BulkPaymentDialog } from '../bulk-payment/BulkPaymentDialog';
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
    totalPayable, overdueTotal, awaitingCount, agingBuckets,
    selectedSupplier,
    isTransactionDialogOpen, setIsTransactionDialogOpen,
    isPaymentDialogOpen, setIsPaymentDialogOpen,
    isCreditMemoDialogOpen, setIsCreditMemoDialogOpen,
    handleViewTransactions, handleMakePayment, handleRecordReturn,
    loadSuppliers,
    selectedIds, selectedSuppliers,
    allPageSelected, somePageSelected,
    handleToggleSelect, handleSelectAll, clearSelection,
    isBulkPaymentOpen, setIsBulkPaymentOpen, handleBulkPayment,
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
        agingBuckets={agingBuckets}
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
        onRecordReturn={handleRecordReturn}
        selectedIds={selectedIds}
        allPageSelected={allPageSelected}
        somePageSelected={somePageSelected}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onClearSelection={clearSelection}
        onBulkPayment={handleBulkPayment}
      />

      {selectedSupplier && (
        <>
          <SupplierTransactionDialog
            supplierId={selectedSupplier.id}
            supplierName={selectedSupplier.name}
            supplier={{
              id: selectedSupplier.id,
              name: selectedSupplier.name,
              company: selectedSupplier.company,
              address: selectedSupplier.address,
              contactNumber: selectedSupplier.contactNumber,
              email: selectedSupplier.email,
              tin: selectedSupplier.tin,
              paymentTerms: selectedSupplier.paymentTerms,
            }}
            open={isTransactionDialogOpen}
            onOpenChange={setIsTransactionDialogOpen}
          />
          <MakePaymentDialog
            supplier={selectedSupplier}
            open={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            onPaymentComplete={loadSuppliers}
          />
          <CreditMemoDialog
            supplierId={selectedSupplier.id}
            supplierName={selectedSupplier.name}
            open={isCreditMemoDialogOpen}
            onOpenChange={setIsCreditMemoDialogOpen}
            onComplete={loadSuppliers}
          />
        </>
      )}

      <BulkPaymentDialog
        suppliers={selectedSuppliers}
        open={isBulkPaymentOpen}
        onOpenChange={setIsBulkPaymentOpen}
        onComplete={() => {
          clearSelection();
          loadSuppliers();
        }}
      />
    </div>
  );
}
