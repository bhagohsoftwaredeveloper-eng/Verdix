'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CashTransfer } from './cash-transfer-types';

export const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(val || 0);

type TableParams = {
  transfers: CashTransfer[];
  totalPages: number;
};

function SortableHeader({ column, label }: { column: any; label: string }) {
  return (
    <button
      className="flex items-center gap-1"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {label}
      {column.getIsSorted() === 'asc' ? (
        <ArrowUp className="h-3 w-3" />
      ) : column.getIsSorted() === 'desc' ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </button>
  );
}

export function useCashTransferTable({ transfers, totalPages }: TableParams) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const columns = useMemo<ColumnDef<CashTransfer>[]>(
    () => [
      {
        accessorKey: 'date',
        header: ({ column }) => <SortableHeader column={column} label="Date" />,
        cell: ({ row }) => format(new Date(row.original.date), 'PP p'),
      },
      {
        accessorKey: 'terminal_name',
        header: 'Terminal',
        cell: ({ row }) => row.original.terminal_name || row.original.terminal_id || '-',
      },
      {
        accessorKey: 'cashier_name',
        header: 'Cashier',
        cell: ({ row }) => row.original.cashier_name || 'Unknown',
      },
      {
        accessorKey: 'amount',
        header: ({ column }) => <SortableHeader column={column} label="Amount" />,
        cell: ({ row }) => (
          <span className={cn('font-bold', row.original.type === 'deposit' ? 'text-green-600' : 'text-red-600')}>
            {row.original.type === 'deposit' ? '+' : '-'}
            {formatCurrency(row.original.amount)}
          </span>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <span className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
            row.original.type === 'deposit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          )}>
            {row.original.type === 'deposit' ? 'Cash In' : 'Cash Out'}
          </span>
        ),
      },
      {
        accessorKey: 'note',
        header: 'Note',
        cell: ({ row }) => (
          <span className="max-w-[200px] truncate block" title={row.original.note || ''}>
            {row.original.note || '-'}
          </span>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: transfers,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  return { table };
}
