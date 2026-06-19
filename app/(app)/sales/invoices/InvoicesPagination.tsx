'use client';

import { Table } from '@tanstack/react-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import type { Sale } from '@/lib/types';

type Props = { table: Table<Sale> };

export function InvoicesPagination({ table }: Props) {
  const totalPages = table.getPageCount() || 1;
  const currentPage = table.getState().pagination.pageIndex + 1;

  const renderPageItems = () => {
    const items = [];
    const max = 5;
    if (totalPages <= max) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink isActive={currentPage === i} onClick={() => table.setPageIndex(i - 1)}>{i}</PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      items.push(<PaginationItem key={1}><PaginationLink isActive={currentPage === 1} onClick={() => table.setPageIndex(0)}>1</PaginationLink></PaginationItem>);
      if (currentPage > 3) items.push(<PaginationItem key="start-ellipsis"><PaginationEllipsis /></PaginationItem>);
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        items.push(<PaginationItem key={i}><PaginationLink isActive={currentPage === i} onClick={() => table.setPageIndex(i - 1)}>{i}</PaginationLink></PaginationItem>);
      }
      if (currentPage < totalPages - 2) items.push(<PaginationItem key="end-ellipsis"><PaginationEllipsis /></PaginationItem>);
      items.push(<PaginationItem key={totalPages}><PaginationLink isActive={currentPage === totalPages} onClick={() => table.setPageIndex(totalPages - 1)}>{totalPages}</PaginationLink></PaginationItem>);
    }
    return items;
  };

  return (
    <div className="flex items-center justify-between px-2 py-4 border-t">
      <div className="flex items-center space-x-2">
        <p className="text-sm font-medium whitespace-nowrap">Rows per page</p>
        <Select value={`${table.getState().pagination.pageSize}`} onValueChange={v => { table.setPageSize(Number(v)); table.setPageIndex(0); }}>
          <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
          <SelectContent side="top">
            {[10, 20, 30, 40, 50].map(n => <SelectItem key={n} value={`${n}`}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {currentPage} of {totalPages}
        </div>
      </div>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious onClick={() => table.previousPage()} className={!table.getCanPreviousPage() ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
          </PaginationItem>
          {renderPageItems()}
          <PaginationItem>
            <PaginationNext onClick={() => table.nextPage()} className={!table.getCanNextPage() ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
