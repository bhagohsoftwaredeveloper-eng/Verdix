'use client';

import { useState, useRef, useMemo } from 'react';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import {
  CalendarIcon,
  Printer,
  Eye,
  FileText,
  X,
  TrendingUp,
  ShoppingCart,
  CreditCard,
  Users,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { TerminalSelector } from '@/components/TerminalSelector';
import { getApiUrl } from '@/lib/api-config';
import { OverallReadingPreview, OverallReadingData } from './overall-reading-preview';
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type PrinterFormat = '58mm' | '80mm' | 'A4';

interface ShiftQueryParams {
  from: string;
  to: string;
  terminalId: string;
}

interface Shift {
  id: string;
  cashier_name: string;
  terminal_id: string;
  end_time: string;
}

export default function OverallReadingPage() {
  const today = new Date();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(today, 7),
    to: today,
  });
  const [terminal, setTerminal] = useState<string>('all');
  const [shiftsQueryParams, setShiftsQueryParams] = useState<ShiftQueryParams>({
    from: format(subDays(today, 7), 'yyyy-MM-dd'),
    to: format(today, 'yyyy-MM-dd'),
    terminalId: 'all',
  });
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [printerFormat, setPrinterFormat] = useState<PrinterFormat>('80mm');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'print'>('view');
  const [shiftsSorting, setShiftsSorting] = useState<SortingState>([]);
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: ['overallReadingShifts', shiftsQueryParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('startDate', shiftsQueryParams.from);
      params.append('endDate', shiftsQueryParams.to);
      if (shiftsQueryParams.terminalId !== 'all') {
        params.append('terminalId', shiftsQueryParams.terminalId);
      }
      const res = await fetch(getApiUrl(`/pos/shifts?${params.toString()}`));
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch shifts');
      if (result.data.length === 0) {
        toast({ title: 'Info', description: 'No completed shifts found for the selected criteria.' });
      }
      return result.data;
    },
  });

  const { data: readingData, isLoading: readingLoading } = useQuery<OverallReadingData>({
    queryKey: ['shiftReading', selectedShift?.id],
    queryFn: async () => {
      if (!selectedShift) throw new Error('No shift selected');
      const params = new URLSearchParams();
      params.append('terminalId', selectedShift.terminal_id);
      params.append('shiftId', selectedShift.id);
      const res = await fetch(getApiUrl(`/sales/overall-reading?${params.toString()}`));
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch reading for shift');
      if (result.data.transactionCount === 0) {
        toast({ title: 'Info', description: `No transactions found for shift ID: ${selectedShift.id}.` });
      }
      return result.data;
    },
    enabled: !!selectedShift,
  });

  const isLoading = shiftsLoading || readingLoading;

  const handleSearchShifts = () => {
    if (!dateRange?.from) {
      toast({ title: 'Error', description: 'Please select a date range', variant: 'destructive' });
      return;
    }
    setSelectedShift(null);
    setShiftsQueryParams({
      from: format(dateRange.from, 'yyyy-MM-dd'),
      to: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd'),
      terminalId: terminal,
    });
  };

  const shiftColumns = useMemo<ColumnDef<Shift>[]>(() => [
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
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], []);

  const shiftsTable = useReactTable({
    data: shifts,
    columns: shiftColumns,
    state: { sorting: shiftsSorting },
    onSortingChange: setShiftsSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleReactToPrintFn = useReactToPrint({
    contentRef: previewRef,
    documentTitle: 'Overall-Reading-Report',
    pageStyle: `
      @page { size: ${printerFormat === 'A4' ? 'A4 portrait' : (printerFormat === '58mm' ? '58mm' : '80mm')} auto; margin: 0; }
      @media print {
        body { visibility: hidden !important; }
        .printable-area { visibility: visible !important; position: absolute; left: 0; top: 0; width: 100%; background-color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .printable-area * { visibility: visible !important; }
      }
    `,
  });

  const handleExportPDF = async () => {
    if (!readingData) return;
    try {
      setIsPreviewOpen(true);
      setTimeout(async () => {
        if (previewRef.current) {
          const canvas = await html2canvas(previewRef.current, { scale: 2, backgroundColor: '#ffffff' });
          const imgData = canvas.toDataURL('image/png');
          const pdfWidth = printerFormat === 'A4' ? 210 : (printerFormat === '58mm' ? 58 : 80);
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: printerFormat === 'A4' ? 'a4' : [pdfWidth, pdfHeight] });
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`Overall-Reading-${selectedShift?.id || 'export'}.pdf`);
          toast({ title: 'Success', description: 'Report exported as PDF' });
        }
      }, 500);
    } catch {
      toast({ title: 'Error', description: 'Failed to export PDF', variant: 'destructive' });
    }
  };

  const maxTerminalSales = readingData?.terminals.reduce((max, t) => Math.max(max, t.netSales), 0) || 1;
  const maxCashierSales = readingData?.cashiers.reduce((max, c) => Math.max(max, c.netSales), 0) || 1;

  return (
    <div className="space-y-6 p-6 bg-slate-50/50 min-h-full rounded-xl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Overall Reading</h1>
          <p className="text-sm text-slate-500 mt-1">View overall reading per completed shift</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn('w-[240px] justify-start text-left font-normal hover:bg-transparent', !dateRange && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>{format(dateRange.from, 'yyyy-MM-dd')} - {format(dateRange.to, 'yyyy-MM-dd')}</>
                    ) : (
                      format(dateRange.from, 'yyyy-MM-dd')
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="range" selected={dateRange} onSelect={setDateRange} initialFocus numberOfMonths={2} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="w-[180px]">
            <TerminalSelector terminalId={terminal} onTerminalChange={setTerminal} showAllOption={true} />
          </div>

          <Button onClick={handleSearchShifts} disabled={isLoading} className="bg-primary hover:bg-primary/90 text-white shadow-sm gap-2">
            <Search className="h-4 w-4" />
            {isLoading ? 'Loading...' : 'Search Shifts'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shifts Table */}
        <div className="lg:col-span-1">
          <Card className="shadow-sm border-slate-100 h-full">
            <CardHeader className="border-b border-slate-50">
              <CardTitle className="text-lg font-semibold text-slate-800">Completed Shifts</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Select a shift to view reading</p>
            </CardHeader>
            <CardContent className="p-0 max-h-[600px] overflow-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  {shiftsTable.getHeaderGroups().map(hg => (
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
                  {shiftsTable.getRowModel().rows.length > 0 ? (
                    shiftsTable.getRowModel().rows.map(row => (
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
                      <TableCell colSpan={2} className="text-center py-8 text-slate-400 text-sm">
                        No shifts found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Reading Details */}
        <div className="lg:col-span-2 space-y-6">
          {readingData ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden relative">
                  <div className="absolute right-[-10px] top-[-10px] opacity-10"><TrendingUp size={100} /></div>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-100">Net Sales</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₱{readingData.netSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    <p className="text-xs text-blue-100 mt-1">Total revenue after deductions</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden relative">
                  <div className="absolute right-[-10px] top-[-10px] opacity-10"><ShoppingCart size={100} /></div>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-100">Gross Sales</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₱{readingData.grossSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    <p className="text-xs text-emerald-100 mt-1">Total revenue before deductions</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-gradient-to-br from-violet-500 to-violet-600 text-white overflow-hidden relative">
                  <div className="absolute right-[-10px] top-[-10px] opacity-10"><CreditCard size={100} /></div>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-violet-100">Transactions</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{readingData.transactionCount}</div>
                    <p className="text-xs text-violet-100 mt-1">Completed transactions</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-gradient-to-br from-amber-500 to-amber-600 text-white overflow-hidden relative">
                  <div className="absolute right-[-10px] top-[-10px] opacity-10"><Users size={100} /></div>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-amber-100">Total Discounts</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₱{readingData.totalDiscounts.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    <p className="text-xs text-amber-100 mt-1">Total discounts given</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Terminal Breakdown */}
                <Card className="shadow-sm border-slate-100">
                  <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-800">Terminal Breakdown</CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">Sales performance per terminal</p>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-5">
                      {readingData.terminals.map((term, idx) => {
                        const percentage = (term.netSales / maxTerminalSales) * 100;
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium text-slate-700">{term.terminalName}</span>
                              <span className="text-slate-500 font-mono">₱{term.netSales.toLocaleString()} ({term.transactionCount} txns)</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        );
                      })}
                      {readingData.terminals.length === 0 && (
                        <div className="text-center text-slate-400 py-4 text-sm">No terminal data available</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Cashier Breakdown */}
                <Card className="shadow-sm border-slate-100">
                  <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-800">Cashier Breakdown</CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">Sales performance per cashier</p>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-5">
                      {readingData.cashiers.map((cashier, idx) => {
                        const percentage = (cashier.netSales / maxCashierSales) * 100;
                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium text-slate-700">{cashier.cashierName}</span>
                              <span className="text-slate-500 font-mono">₱{cashier.netSales.toLocaleString()} ({cashier.transactionCount} txns)</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        );
                      })}
                      {readingData.cashiers.length === 0 && (
                        <div className="text-center text-slate-400 py-4 text-sm">No cashier data available</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Actions Section */}
              <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Print Format:</span>
                  <Select value={printerFormat} onValueChange={(value) => setPrinterFormat(value as PrinterFormat)}>
                    <SelectTrigger className="w-[100px] h-8 text-xs bg-slate-50 border-none">
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58mm">58mm</SelectItem>
                      <SelectItem value="80mm">80mm</SelectItem>
                      <SelectItem value="A4">A4 (Simple)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" onClick={() => { setModalMode('view'); setIsPreviewOpen(true); }} className="gap-2 border-slate-200 hover:bg-slate-50">
                    <Eye className="h-4 w-4 text-slate-600" />
                    View Receipt
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2 border-slate-200 hover:bg-slate-50">
                    <FileText className="h-4 w-4 text-slate-600" />
                    Export PDF
                  </Button>
                  <Button size="sm" onClick={() => { setModalMode('print'); setIsPreviewOpen(true); }} className="gap-2 bg-primary hover:bg-primary/90 text-white">
                    <Printer className="h-4 w-4" />
                    Print Report
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] bg-white rounded-xl shadow-sm border border-slate-100 text-slate-400">
              <div className="bg-slate-50 p-4 rounded-full mb-4">
                <FileText size={40} className="text-slate-300" />
              </div>
              <p className="text-lg font-medium text-slate-600">No Shift Selected</p>
              <p className="text-sm text-slate-400 mt-1">Select a shift from the list to view its overall reading.</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && readingData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={cn(
            'bg-white w-full max-h-[90vh] flex flex-col rounded-xl shadow-2xl overflow-hidden border border-slate-100 transition-all duration-300',
            printerFormat === '58mm' && 'max-w-[350px]',
            printerFormat === '80mm' && 'max-w-[450px]',
            printerFormat === 'A4' && 'max-w-[900px]'
          )}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Overall Reading Receipt</h2>
                <p className="text-xs text-slate-500 mt-0.5">Preview of the printed report</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full" onClick={() => setIsPreviewOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-100/50 p-6 flex justify-center">
              <div ref={previewRef} className="printable-area bg-white shadow-sm h-fit rounded-lg overflow-hidden border border-slate-200/60">
                <OverallReadingPreview data={readingData} printerFormat={printerFormat} />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
              {modalMode === 'print' ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">Format:</span>
                    <Select value={printerFormat} onValueChange={(value) => setPrinterFormat(value as PrinterFormat)}>
                      <SelectTrigger className="w-[100px] h-8 text-xs bg-white border-slate-200">
                        <SelectValue placeholder="Format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="58mm">58mm</SelectItem>
                        <SelectItem value="80mm">80mm</SelectItem>
                        <SelectItem value="A4">A4 (Simple)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(false)} className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700">
                      Close
                    </Button>
                    <Button size="sm" onClick={handleReactToPrintFn} disabled={!readingData} className="bg-primary hover:bg-primary/90 text-white gap-2">
                      <Printer className="h-4 w-4" />
                      Print Now
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex justify-end w-full">
                  <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(false)} className="bg-white border-slate-200 hover:bg-slate-50 text-slate-700">
                    Close
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
