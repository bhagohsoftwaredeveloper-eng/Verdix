'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

type PaginationState = {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
};

type Props = {
  payments: any[];
  loading: boolean;
  pagination: PaginationState;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
};

export function SupplierPaymentsTable({ payments, loading, pagination, setPage, setPageSize }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">Payment History</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Supplier</TableHead>
                <TableHead className="font-semibold">Reference</TableHead>
                <TableHead className="font-semibold">Method</TableHead>
                <TableHead className="font-semibold">Notes</TableHead>
                <TableHead className="text-right font-semibold">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <div className="h-10 w-full animate-pulse bg-muted rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No payments found.
                  </TableCell>
                </TableRow>
              ) : payments.map(payment => (
                <TableRow key={payment.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="text-sm">{format(new Date(payment.date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell className="font-medium">{payment.supplierName}</TableCell>
                  <TableCell className="font-mono text-xs">{payment.reference || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">{payment.paymentMethod}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={payment.notes}>
                    {payment.notes || '-'}
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="py-4 border-t mt-4">
          <DataTablePagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            setPage={setPage}
            setPageSize={setPageSize}
          />
        </div>
      </CardContent>
    </Card>
  );
}
