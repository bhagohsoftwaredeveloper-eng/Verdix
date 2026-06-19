import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

type Props = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

function buildPageItems(currentPage: number, totalPages: number, onPageChange: (p: number) => void) {
  const items = [];
  const max = 5;

  if (totalPages <= max) {
    for (let i = 1; i <= totalPages; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink isActive={currentPage === i} onClick={() => onPageChange(i)} className="cursor-pointer">
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
  } else {
    items.push(
      <PaginationItem key={1}>
        <PaginationLink isActive={currentPage === 1} onClick={() => onPageChange(1)} className="cursor-pointer">1</PaginationLink>
      </PaginationItem>
    );
    if (currentPage > 3)
      items.push(<PaginationItem key="e1"><PaginationEllipsis /></PaginationItem>);
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink isActive={currentPage === i} onClick={() => onPageChange(i)} className="cursor-pointer">{i}</PaginationLink>
        </PaginationItem>
      );
    }
    if (currentPage < totalPages - 2)
      items.push(<PaginationItem key="e2"><PaginationEllipsis /></PaginationItem>);
    items.push(
      <PaginationItem key={totalPages}>
        <PaginationLink isActive={currentPage === totalPages} onClick={() => onPageChange(totalPages)} className="cursor-pointer">
          {totalPages}
        </PaginationLink>
      </PaginationItem>
    );
  }
  return items;
}

export function CashTransferPagination({ currentPage, totalPages, totalCount, pageSize, onPageChange, onPageSizeChange }: Props) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
      <div className="flex items-center gap-2 order-2 sm:order-1">
        <Label htmlFor="rows-per-page" className="text-xs text-muted-foreground whitespace-nowrap">
          Rows per page
        </Label>
        <Select value={pageSize.toString()} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger id="rows-per-page" className="h-8 w-[70px] text-xs">
            <SelectValue placeholder={pageSize.toString()} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-2">Total: {totalCount} records</span>
      </div>
      <div className="order-1 sm:order-2">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                aria-disabled={currentPage === 1}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {buildPageItems(currentPage, totalPages, onPageChange)}
            <PaginationItem>
              <PaginationNext
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                aria-disabled={currentPage === totalPages}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
