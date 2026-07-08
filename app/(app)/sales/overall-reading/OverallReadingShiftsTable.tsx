'use client';

import { useMemo, useState } from 'react';
import { ColumnDef, SortingState, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Shift } from './use-overall-reading-page';

interface Props {
  shifts: Shift[];
  isLoading: boolean;
  selectedShift: Shift | null;
  setSelectedShift: (shift: Shift) => void;
}

export function OverallReadingShiftsTable({ shifts, isLoading, selectedShift, setSelectedShift }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<Shift>[]>(() => [
    {
      accessorKey: 'cashier_name',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Cashier
          {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-3 w-3" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-2 h-3 w-3" /> : <ArrowUpDown className="ml-2 h-3 w-3" />}
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-slate-700 text-sm">{row.getValue('cashier_name') || 'Unknown'}</span>
          <span className="text-xs text-slate-500">{row.original.terminal_id}</span>
          <span className="text-[10px] text-slate-400">{format(new Date(row.original.end_time), 'PPp')}</span>
        </div>
      ),
    },
    {
      id: 'actions',
      enableSorting: false,
      header: () => <div className="text-right text-xs">Action</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-primary hover:text-primary hover:bg-primary/10"
            onClick={(e) => { e.stopPropagation(); setSelectedShift(row.original); }}
          >
            <span className="text-xs">View</span>
          </Button>
        </div>
      ),
    },
  ], [setSelectedShift]);

  const table = useReactTable({
    data: shifts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Card className="shadow-sm border-slate-100 h-full">
      <CardHeader className="border-b border-slate-50">
        <CardTitle className="text-lg font-semibold text-slate-800">Completed Shifts</CardTitle>
        <p className="text-xs text-slate-500 mt-0.5">Select a shift to view reading</p>
      </CardHeader>
      <CardContent className="p-0 max-h-[600px] overflow-auto">
        <Table>
          <TableHeader className="bg-slate-50/50">
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(header => (
                  <TableHead key={header.id} className="text-xs">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-8 text-slate-400 text-sm">Loading shifts...</TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  className={cn(
                    'cursor-pointer hover:bg-slate-50 transition-colors',
                    selectedShift?.id === row.original.id && 'bg-blue-50/50 hover:bg-blue-50/50'
                  )}
                  onClick={() => setSelectedShift(row.original)}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-8 text-slate-400 text-sm">No shifts found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
