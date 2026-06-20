'use client';

import { Table as TanTable } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { SupplierWithBalance, SupplierFilters } from '../actions';
import { SupplierListFilter } from './SupplierListFilter';

type Props = {
  table: TanTable<SupplierWithBalance>;
  loading: boolean;
  columnCount: number;
  filters: SupplierFilters;
  setFilters: React.Dispatch<React.SetStateAction<SupplierFilters>>;
  globalFilter: string;
  setGlobalFilter: (v: string) => void;
  totalRows: number;
  startIndex: number;
  endIndex: number;
};

export function SupplierListCard({
  table, loading, columnCount,
  filters, setFilters,
  globalFilter, setGlobalFilter,
  totalRows, startIndex, endIndex,
}: Props) {
  const { pageIndex, pageSize } = table.getState().pagination;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>All Suppliers</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                className="pl-8"
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
              />
            </div>
            <SupplierListFilter filters={filters} setFilters={setFilters} />
            {Object.keys(filters).length > 0 && (
              <Button variant="ghost" size="sm" className="h-9 px-2 text-muted-foreground" onClick={() => setFilters({})}>
                Clear <X className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-auto max-h-[calc(100vh-340px)] border rounded-md">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <TableHead key={header.id} className="bg-background">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className="text-center py-10">Loading...</TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className="text-center py-10 text-muted-foreground">No suppliers found.</TableCell>
                </TableRow>
              ) : table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalRows > 0 && (
          <div className="flex items-center justify-between px-2 py-4">
            <span className="text-sm text-muted-foreground">
              Showing {startIndex} to {endIndex} of {totalRows} entries
            </span>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <Select value={pageSize.toString()} onValueChange={v => table.setPageSize(Number(v))}>
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50, 100].map(size => (
                      <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-sm font-medium">Page {pageIndex + 1} of {table.getPageCount()}</span>
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
