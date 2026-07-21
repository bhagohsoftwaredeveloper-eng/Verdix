'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ReturnRecord } from './returns-types';

export function useReturnsTable(records: ReturnRecord[]) {
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const columns = useMemo<ColumnDef<ReturnRecord>[]>(
    () => [
      {
        accessorKey: 'currSiNo',
        header: ({ column }) => (
          <button className="flex items-center gap-1" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            MC No.
            {column.getIsSorted() === 'asc' ? <ArrowUp className="h-3 w-3" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-50" />}
          </button>
        ),
        cell: ({ row }) => <span className="font-medium text-primary">{row.original.currSiNo}</span>,
      },
      { accessorKey: 'origSiNo', header: 'Orig SI No.' },
      {
        accessorKey: 'transDate',
        header: ({ column }) => (
          <button className="flex items-center gap-1" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Trans Date
            {column.getIsSorted() === 'asc' ? <ArrowUp className="h-3 w-3" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-50" />}
          </button>
        ),
        cell: ({ row }) => row.original.transDate ? format(new Date(row.original.transDate), 'MM/dd/yy hh:mma') : '-',
      },
      {
        accessorKey: 'soldByCashier',
        header: 'Sold By',
        cell: ({ row }) => row.original.soldByCashier || '-',
      },
      {
        accessorKey: 'returnedDate',
        header: 'Return Date',
        cell: ({ row }) => row.original.returnedDate ? format(new Date(row.original.returnedDate), 'MM/dd/yy hh:mma') : '-',
      },
      {
        accessorKey: 'returnedByCashier',
        header: 'Returned By',
        cell: ({ row }) => row.original.returnedByCashier || '-',
      },
      {
        accessorKey: 'overrideBy',
        header: 'Override By',
        cell: ({ row }) => row.original.overrideBy || '-',
      },
      {
        accessorKey: 'salesAmount',
        header: ({ column }) => (
          <button className="flex items-center gap-1 justify-end w-full" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Amount
            {column.getIsSorted() === 'asc' ? <ArrowUp className="h-3 w-3" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-50" />}
          </button>
        ),
        cell: ({ row }) => <span className="text-right block font-mono">{row.original.salesAmount.toFixed(2)}</span>,
      },
      {
        accessorKey: 'cost',
        header: 'Cost',
        cell: ({ row }) => <span className="text-right block font-mono text-muted-foreground">{row.original.cost.toFixed(2)}</span>,
      },
      {
        accessorKey: 'profit',
        header: ({ column }) => (
          <button className="flex items-center gap-1 justify-end w-full" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Profit
            {column.getIsSorted() === 'asc' ? <ArrowUp className="h-3 w-3" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-50" />}
          </button>
        ),
        cell: ({ row }) => (
          <span className={cn('text-right block font-mono', row.original.profit >= 0 ? 'text-green-600' : 'text-red-600')}>
            {row.original.profit.toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: 'vatableSales',
        header: 'Vatable',
        cell: ({ row }) => <span className="text-right block font-mono">{row.original.vatableSales.toFixed(2)}</span>,
      },
      {
        accessorKey: 'vatAmount',
        header: 'VAT',
        cell: ({ row }) => <span className="text-right block font-mono">{row.original.vatAmount.toFixed(2)}</span>,
      },
      {
        accessorKey: 'note',
        header: 'Note',
        cell: ({ row }) => (
          <span className="max-w-[80px] truncate block text-muted-foreground" title={row.original.note || ''}>
            {row.original.note || '-'}
          </span>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: records,
    columns,
    state: { sorting, columnVisibility, globalFilter },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  return {
    table,
    columns,
    selectedRow, setSelectedRow,
    viewMode, setViewMode,
    globalFilter, setGlobalFilter,
  };
}
