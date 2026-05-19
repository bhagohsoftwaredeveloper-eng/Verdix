'use client';

import { useState, useRef, useMemo } from 'react';
import {
  ColumnDef,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  CalendarIcon,
  X,
  Image as ImageIcon,
  FileText,
  Printer,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useReactToPrint } from 'react-to-print';
import { getApiUrl } from '@/lib/api-config';
import { XReadingPreview, XReadingData } from './x-reading-preview';
import { BusinessSettings } from '../z-reading/z-reading-preview';

type PrinterFormat = '58mm' | '80mm';

interface QueryParams {
  from: string;
  to: string;
}

export default function XReadingPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [queryParams, setQueryParams] = useState<QueryParams | null>(null);
  const [printerFormat, setPrinterFormat] = useState<PrinterFormat>('80mm');
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [selectedReading, setSelectedReading] = useState<XReadingData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);

  const { data: businessSettings } = useQuery<BusinessSettings | null>({
    queryKey: ['posSettings'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('/pos-settings'));
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result = await res.json();
      return result.success ? result.data : null;
    },
  });

  const { data: xReadings = [], isLoading } = useQuery<XReadingData[]>({
    queryKey: ['xReadings', queryParams],
    queryFn: async () => {
      if (!queryParams) return [];
      const params = new URLSearchParams();
      params.append('startDate', queryParams.from);
      params.append('endDate', queryParams.to);
      const res = await fetch(getApiUrl(`/sales/x-reading?${params.toString()}`));
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result = await res.json();
      if (!result.success) return [];
      return result.data;
    },
    enabled: !!queryParams,
  });

  const uniqueCashiers = useMemo(
    () => Array.from(new Set(xReadings.map(r => r.cashierName).filter(Boolean))) as string[],
    [xReadings]
  );

  const filteredReadings = useMemo(
    () => xReadings.filter(r => selectedCashier === 'all' || r.cashierName === selectedCashier),
    [xReadings, selectedCashier]
  );

  const handleShowReport = () => {
    if (!dateRange?.from) {
      toast({ title: 'Error', description: 'Please select a date range', variant: 'destructive' });
      return;
    }
    setQueryParams({
      from: format(dateRange.from, 'yyyy-MM-dd'),
      to: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd'),
    });
  };

  const columns = useMemo<ColumnDef<XReadingData>[]>(() => [
    {
      accessorKey: 'id',
      header: 'Shift ID',
      cell: ({ row }) => <span className="font-medium font-mono">{row.getValue('id')}</span>,
    },
    {
      accessorKey: 'shiftStart',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Shift Start
          {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-2 h-4 w-4" /> : <ArrowUpDown className="ml-2 h-4 w-4" />}
        </Button>
      ),
      cell: ({ row }) => {
        const v = row.getValue<string>('shiftStart');
        return v ? format(new Date(v), 'PP p') : 'N/A';
      },
    },
    {
      accessorKey: 'shiftEnd',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Shift End
          {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-2 h-4 w-4" /> : <ArrowUpDown className="ml-2 h-4 w-4" />}
        </Button>
      ),
      cell: ({ row }) => {
        const v = row.getValue<string>('shiftEnd');
        return v ? format(new Date(v), 'PP p') : 'Active';
      },
    },
    {
      accessorKey: 'cashierName',
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Cashier
          {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-2 h-4 w-4" /> : <ArrowUpDown className="ml-2 h-4 w-4" />}
        </Button>
      ),
      cell: ({ row }) => row.getValue('cashierName') || 'N/A',
    },
    {
      accessorKey: 'shiftStatus',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue<string>('shiftStatus');
        return (
          <span className={cn('px-2 py-1 rounded-full text-xs font-semibold', status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: 'netSales',
      header: ({ column }) => (
        <div className="text-right">
          <Button variant="ghost" size="sm" className="-mr-3 h-8" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Net Sales
            {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-2 h-4 w-4" /> : <ArrowUpDown className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right font-mono">₱{(row.getValue<number>('netSales') ?? 0).toFixed(2)}</div>
      ),
    },
    {
      id: 'actions',
      enableSorting: false,
      enableHiding: false,
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const reading = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleView(reading)} title="View"><Eye className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => handlePrint(reading)} title="Print"><Printer className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => handleExportPDF(reading)} title="Export as PDF"><FileText className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => handleExportImage(reading)} title="Export as Image"><ImageIcon className="h-4 w-4" /></Button>
          </div>
        );
      },
    },
  ], []);

  const table = useReactTable({
    data: filteredReadings,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleExportPDF = async (reading: XReadingData) => {
    try {
      setSelectedReading(reading);
      setIsPreviewOpen(true);
      setTimeout(async () => {
        if (previewRef.current) {
          const canvas = await html2canvas(previewRef.current, { scale: 2, backgroundColor: '#ffffff' });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: printerFormat === '58mm' ? [58, 297] : [80, 297] });
          const pdfWidth = printerFormat === '58mm' ? 58 : 80;
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`X-Reading-${reading.id}.pdf`);
          toast({ title: 'Success', description: 'X-Reading exported as PDF' });
        }
      }, 500);
    } catch {
      toast({ title: 'Error', description: 'Failed to export PDF', variant: 'destructive' });
    }
  };

  const handleExportImage = async (reading: XReadingData) => {
    try {
      setSelectedReading(reading);
      setIsPreviewOpen(true);
      setTimeout(async () => {
        if (previewRef.current) {
          const canvas = await html2canvas(previewRef.current, { scale: 2, backgroundColor: '#ffffff' });
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `X-Reading-${reading.id}.png`;
              link.click();
              URL.revokeObjectURL(url);
              toast({ title: 'Success', description: 'X-Reading exported as image' });
            }
          });
        }
      }, 500);
    } catch {
      toast({ title: 'Error', description: 'Failed to export image', variant: 'destructive' });
    }
  };

  const handleReactToPrintFn = useReactToPrint({
    contentRef: previewRef,
    documentTitle: 'X-Reading-Report',
    pageStyle: `
      @page { size: ${printerFormat === '58mm' ? '58mm' : '80mm'} auto; margin: 0; }
      @media print { body { visibility: visible !important; -webkit-print-color-adjust: exact; } * { visibility: visible !important; } }
    `,
  });

  const handlePrint = (reading?: XReadingData) => {
    if (reading) {
      setSelectedReading(reading);
      setIsPreviewOpen(true);
      setTimeout(() => handleReactToPrintFn(), 500);
    } else if (selectedReading) {
      handleReactToPrintFn();
    }
  };

  const handleView = (reading: XReadingData) => {
    setSelectedReading(reading);
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4 p-1 bg-background rounded-lg">
        {/* Date Picker */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Date
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn('w-[300px] justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
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
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="range" selected={dateRange} onSelect={setDateRange} initialFocus numberOfMonths={2} />
            </PopoverContent>
          </Popover>
        </div>

        {/* Cashier Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Cashier
          </label>
          <Select value={selectedCashier} onValueChange={setSelectedCashier} disabled={xReadings.length === 0}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Cashiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cashiers</SelectItem>
              {uniqueCashiers.map((cashier) => (
                <SelectItem key={cashier} value={cashier}>{cashier}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleShowReport} className="bg-white hover:bg-gray-100 text-black border border-gray-200 shadow-sm">
          Show Report
        </Button>
      </div>

      <div className="border-t pt-6">
        {queryParams ? (
          isLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="text-muted-foreground">Loading X-readings...</div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-end mb-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Columns className="h-4 w-4" />
                      Columns
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {table.getAllColumns().filter(col => col.getCanHide()).map(col => (
                      <DropdownMenuCheckboxItem
                        key={col.id}
                        className="capitalize"
                        checked={col.getIsVisible()}
                        onCheckedChange={val => col.toggleVisibility(!!val)}
                      >
                        {col.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map(hg => (
                    <TableRow key={hg.id}>
                      {hg.headers.map(header => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map(row => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map(cell => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center h-24">
                        No X-readings found for the selected {selectedCashier !== 'all' ? 'cashier' : 'date'}.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )
        ) : null}
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && selectedReading && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl max-h-[90vh] flex flex-col rounded shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-lg font-medium text-gray-700">X-READING</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-700" onClick={() => setIsPreviewOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50 p-4 flex justify-center">
              <div ref={previewRef} className="bg-white shadow-sm h-fit">
                <XReadingPreview data={selectedReading} printerFormat={printerFormat} businessSettings={businessSettings} />
              </div>
            </div>
            <div className="px-4 py-3 border-t bg-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Format:</span>
                <Select value={printerFormat} onValueChange={(value) => setPrinterFormat(value as PrinterFormat)}>
                  <SelectTrigger className="w-[90px] h-8 text-xs bg-white">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58mm">58mm</SelectItem>
                    <SelectItem value="80mm">80mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)} className="bg-white">Close</Button>
                <Button onClick={handleReactToPrintFn} disabled={!selectedReading} className="bg-[#008CCB] hover:bg-[#007cb3] text-white">
                  POS Print
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
