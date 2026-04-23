# API Endpoints List

This file matches the `app/api` directory structure.

## Accounts & Auth

- `/api/accounts`
- `/api/auth/login`
- `/api/auth/signup`

## Approvals

- `/api/approvals/process`
- `/api/approvals/queue`
- `/api/approvals/workflows`

## Bad Orders

- `/api/bad-orders`
- `/api/bad-orders/[id]`
- `/api/bad-orders/stats`

## Customers & Loyalty

- `/api/customer-loyalty`
- `/api/customer-loyalty/[id]`
- `/api/customer-loyalty/adjust-points`
- `/api/customer-loyalty/lookup`
- `/api/customer-loyalty/point-history`
- `/api/customer-payments`
- `/api/customers`
- `/api/customers/[id]`
- `/api/customers/[id]/check-transactions`
- `/api/customers/balances`
- `/api/customers/invoices/[id]`
- `/api/customers/invoices/[id]/payment`
- `/api/customers/invoices/outstanding`
- `/api/customers/payments`

## Data Management

- `/api/data`
- `/api/data-management/export/customers`
- `/api/data-management/export/products`
- `/api/data-management/import/customers`
- `/api/data-management/import/products`
- `/api/data-management/reset`
- `/api/migrate`
- `/api/migrate/batch-costing`
- `/api/migrate/fix-batch-ids`

## External API

- `/api/external-api/logs`
- `/api/external-api/logs/[id]/retry`

## POS (Point of Sale)

- `/api/pos/cash-transfer`
- `/api/pos/checkout`
- `/api/pos/payment-validation`
- `/api/pos/recent-sales`
- `/api/pos/shifts`
- `/api/pos/terminals`
- `/api/pos/void-transaction`
- `/api/pos-settings`
- `/api/pos-settings/upload-logo`
- `/api/pos-terminals`
- `/api/pos-transactions`

## Products & Inventory

- `/api/products`
- `/api/products/[id]`
- `/api/products/attributes`
- `/api/price-levels`
- `/api/stock-adjustments`
- `/api/stock-adjustments/[id]`
- `/api/stock-movements`
- `/api/inventory/adjust/bulk`
- `/api/inventory/stock-counts`
- `/api/inventory/stock-counts/[id]`
- `/api/inventory/stock-counts/[id]/complete`
- `/api/inventory/stock-counts/[id]/items`
- `/api/inventory/transfer`
- `/api/inventory/transfer/bulk`
- `/api/shelf-locations`
- `/api/shelf-locations/[id]`
- `/api/suppliers`
- `/api/suppliers/[id]`
- `/api/suppliers/[id]/balance`
- `/api/suppliers/export`
- `/api/temp-suppliers`
- `/api/warehouses`
- `/api/warehouses/[id]`

## Purchase Orders

- `/api/purchase-orders`
- `/api/purchase-orders/[id]`
- `/api/purchase-orders/export`

## Reports

- `/api/reports/adjustments`
- `/api/reports/inventory`
- `/api/reports/movements`
- `/api/reports/purchases/by-product`
- `/api/reports/purchases/by-supplier`
- `/api/reports/soa`
- `/api/reports/stats`
- `/api/reports/velocity`

## Sales & Orders

- `/api/sales`
- `/api/sales/batch-analysis`
- `/api/sales/by-date`
- `/api/sales/by-product`
- `/api/sales/ejournal`
- `/api/sales/hourly`
- `/api/sales/invoices/[id]/void`
- `/api/sales/monthly-category`
- `/api/sales/orders`
- `/api/sales/orders/[id]`
- `/api/sales/returns`
- `/api/sales/top-products`
- `/api/sales/transactions`
- `/api/sales/voids-report`
- `/api/sales/x-reading`
- `/api/sales/z-reading`
- `/api/sales-areas`
- `/api/sales-groups`
- `/api/sales-persons`
- `/api/sales-persons/[id]`

## Settings & Configuration

- `/api/settings/api-config`
- `/api/settings/api-connection`
- `/api/settings/backup/download/[filename]`
- `/api/settings/backup/files`
- `/api/settings/backup/manual`
- `/api/settings/backup/restore`
- `/api/settings/backup/schedule`
- `/api/settings/database`
- `/api/settings/external-api`
- `/api/settings/tax-rates`
- `/api/settings/tax-rates/[id]`
- `/api/loyalty-settings`
- `/api/loyalty-settings/[id]`
- `/api/payment-methods`
- `/api/payment-methods/[id]`
- `/api/payment-term-types`
- `/api/payment-terms`
- `/api/transaction-references`
- `/api/transactions/all-references`
- `/api/transactions/last-references`
- `/api/user-types`
- `/api/user-types/[id]`
- `/api/users`
- `/api/users/[uid]`

## Other

- `/api/forward`
- `/api/send-products`
