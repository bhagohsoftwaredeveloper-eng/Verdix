'use client';

import { SupplierPaymentsFilter } from './SupplierPaymentsFilter';
import { SupplierPaymentsTable } from './SupplierPaymentsTable';
import { useSupplierPayments } from './use-supplier-payments';

export default function SupplierPaymentsPage() {
  const {
    payments, loading,
    searchTerm, setSearchTerm,
    dateRange, setDateRange,
    paymentMethod, setPaymentMethod,
    pagination, setPage, setPageSize,
  } = useSupplierPayments();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Payment Suppliers</h2>
      </div>

      <SupplierPaymentsFilter
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        dateRange={dateRange}
        setDateRange={setDateRange}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
      />

      <SupplierPaymentsTable
        payments={payments}
        loading={loading}
        pagination={pagination}
        setPage={setPage}
        setPageSize={setPageSize}
      />
    </div>
  );
}
