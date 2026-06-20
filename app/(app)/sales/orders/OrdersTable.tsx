'use client';

import { Table as ReactTable, ColumnDef, flexRender } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import type { Sale } from '@/lib/types';

type Props = {
  table: ReactTable<Sale>;
  columns: ColumnDef<Sale>[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  limit: number;
  onLimitChange: (val: number) => void;
  onPageChange: (page: number) => void;
  salesCount: number;
};

export function OrdersTable({ table, columns, isLoading, currentPage, totalPages, limit, onLimitChange, onPageChange, salesCount }: Props) {
  return (
    <>
      <Table wrapperClassName="max-h-[500px] overflow-auto border rounded-md">
        <TableHeader className="sticky top-0 z-30 bg-background">
          {table.getHeaderGroups().map(hg => (
            <TableRow key={hg.id}>
              {hg.headers.map(header => (
                <TableHead key={header.id} className={cn(header.column.id === 'total' && 'text-right', header.column.id === 'status' && 'text-center')}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Loading...</TableCell></TableRow>
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No sales orders found matching constraints.</TableCell></TableRow>
          ) : (
            table.getRowModel().rows.map(row => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {!isLoading && salesCount > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 non-printable">
          <div className="flex items-center gap-2 order-2 sm:order-1">
            <Label htmlFor="rows-per-page" className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</Label>
            <Select value={limit.toString()} onValueChange={(val) => onLimitChange(Number(val))}>
              <SelectTrigger id="rows-per-page" className="h-8 w-[70px] text-xs"><SelectValue placeholder={limit.toString()} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="order-1 sm:order-2">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious onClick={() => onPageChange(currentPage - 1)} aria-disabled={currentPage === 1} className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink>{currentPage} of {totalPages}</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext onClick={() => onPageChange(currentPage + 1)} aria-disabled={currentPage === totalPages} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
    </>
  );
}
