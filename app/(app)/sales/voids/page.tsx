'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  CalendarIcon,
  FileDown,
  TrendingUp,
  Receipt,
  Percent,
  Ban,
  LayoutGrid,
  Table as TableIcon,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import jsPDF from 'jspdf';
import { getApiUrl } from '@/lib/api-config';
import { useQuery } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VoidRecord {
  refNo: string;
  siNo: string;
  transDate: string;
  customer: string;
  cashier: string;
  voidDate: string;
  voidedBy: string;
  overrideBy: string;
  salesAmount: number;
  cost: number;
  profit: number;
  vatableSales: number;
  vatAmount: number;
  note: string;
}

export default function VoidedSalesPage() {
  const [fromDate, setFromDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [toDate, setToDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [queryDates, setQueryDates] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: records = [], isLoading, isError, error } = useQuery<VoidRecord[]>({
    queryKey: ['voids', queryDates.from?.toISOString(), queryDates.to?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (queryDates.from) params.append('startDate', format(queryDates.from, 'yyyy-MM-dd'));
      if (queryDates.to) params.append('endDate', format(queryDates.to, 'yyyy-MM-dd'));
      const response = await fetch(getApiUrl(`/sales/voids-report?${params.toString()}`));
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const result = await response.json();
      if (result.success) return result.data;
      throw new Error(result.error || 'Failed to load voided sales.');
    },
    // Don't retry 3x with backoff on failure — that makes a failed request look
    // like a multi-second "hang" before the table silently goes empty.
    retry: 1,
    // Keep showing the previous results while a new date range loads instead of
    // blanking the whole table.
    placeholderData: (prev) => prev,
  });

  const totals = useMemo(
    () => ({
      revenue: records.reduce((sum, r) => sum + r.salesAmount, 0),
      cost: records.reduce((sum, r) => sum + r.cost, 0),
      profit: records.reduce((sum, r) => sum + r.profit, 0),
      vatableSales: records.reduce((sum, r) => sum + r.vatableSales, 0),
      vatAmount: records.reduce((sum, r) => sum + r.vatAmount, 0),
    }),
    [records]
  );

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const columns = useMemo<ColumnDef<VoidRecord>[]>(
    () => [
      {
        id: 'select',
        header: '',
        cell: ({ row }) => (
          <Checkbox
            checked={selectedIds.has(row.original.refNo)}
            onCheckedChange={() => toggleSelectRow(row.original.refNo)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'refNo',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Ref No.
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium text-primary leading-tight">{row.original.refNo}</div>
            <div className="text-[10px] text-muted-foreground">{row.original.siNo}</div>
          </div>
        ),
      },
      {
        accessorKey: 'transDate',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Date
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) =>
          row.original.transDate
            ? format(new Date(row.original.transDate), 'MM/dd/yy')
            : '-',
      },
      {
        accessorKey: 'customer',
        header: 'Customer',
        cell: ({ row }) => (
          <span className="max-w-[100px] truncate block" title={row.original.customer}>
            {row.original.customer}
          </span>
        ),
      },
      {
        accessorKey: 'cashier',
        header: 'Cashier',
        cell: ({ row }) => row.original.cashier || '-',
      },
      {
        id: 'voidInfo',
        accessorKey: 'voidDate',
        header: 'Void Info',
        cell: ({ row }) => (
          <div className="leading-tight">
            <div>{row.original.voidDate ? format(new Date(row.original.voidDate), 'MM/dd/yy') : '-'}</div>
            <div className="text-[10px] text-muted-foreground">{row.original.voidedBy || '-'}</div>
          </div>
        ),
      },
      {
        accessorKey: 'salesAmount',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 justify-end w-full"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Amount
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-right block font-mono">
            {row.original.salesAmount.toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: 'cost',
        header: 'Cost',
        cell: ({ row }) => (
          <span className="text-right block font-mono text-muted-foreground">
            {row.original.cost.toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: 'profit',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 justify-end w-full"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Profit
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => (
          <span
            className={cn(
              'text-right block font-mono',
              row.original.profit >= 0 ? 'text-green-600' : 'text-red-600'
            )}
          >
            {row.original.profit.toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: 'vatableSales',
        header: 'Vatable',
        cell: ({ row }) => (
          <span className="text-right block font-mono">{row.original.vatableSales.toFixed(2)}</span>
        ),
      },
      {
        accessorKey: 'vatAmount',
        header: 'VAT',
        cell: ({ row }) => (
          <span className="text-right block font-mono">{row.original.vatAmount.toFixed(2)}</span>
        ),
      },
      {
        accessorKey: 'note',
        header: 'Note',
        cell: ({ row }) => (
          <span
            className="max-w-[80px] truncate block text-muted-foreground"
            title={row.original.note || ''}
          >
            {row.original.note || '-'}
          </span>
        ),
      },
    ],
    [selectedIds]
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

  const formatCurrency = (value: number) =>
    `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const exportToPDF = () => {
    if (records.length === 0) {
      toast({ title: 'No Data', description: 'No records to export.', variant: 'destructive' });
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      let yPos = margin;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Voided Sales Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const dateRangeText = `From: ${queryDates.from ? format(queryDates.from, 'yyyy-MM-dd') : 'N/A'} To: ${queryDates.to ? format(queryDates.to, 'yyyy-MM-dd') : 'N/A'}`;
      doc.text(dateRangeText, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      const headers = ['RefNo.', 'Trans Date', 'Customer', 'Cashier', 'Void Date', 'Voided By', 'Override By', 'Sales Amt', 'Cost', 'Profit', 'Vatable', 'VAT', 'Note'];
      const colWidths = [22, 22, 25, 18, 22, 18, 18, 18, 16, 16, 18, 14, 30];

      doc.setFillColor(220, 53, 69);
      doc.rect(margin, yPos - 4, pageWidth - margin * 2, 8, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);

      let xPos = margin;
      headers.forEach((header, i) => {
        doc.text(header, xPos + 1, yPos, { maxWidth: colWidths[i] - 2 });
        xPos += colWidths[i];
      });
      yPos += 6;

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);

      records.forEach((record, rowIndex) => {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = margin;
          doc.setFillColor(220, 53, 69);
          doc.rect(margin, yPos - 4, pageWidth - margin * 2, 8, 'F');
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          xPos = margin;
          headers.forEach((header, i) => {
            doc.text(header, xPos + 1, yPos, { maxWidth: colWidths[i] - 2 });
            xPos += colWidths[i];
          });
          yPos += 6;
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
        }

        if (rowIndex % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, yPos - 3, pageWidth - margin * 2, 6, 'F');
        }

        xPos = margin;
        const rowData = [
          `${record.refNo}\n${record.siNo}`,
          record.transDate ? format(new Date(record.transDate), 'MMM dd, yyyy') : '-',
          record.customer,
          record.cashier,
          record.voidDate ? format(new Date(record.voidDate), 'MMM dd, yyyy hh:mma') : '-',
          record.voidedBy,
          record.overrideBy,
          record.salesAmount.toFixed(2),
          record.cost.toFixed(2),
          record.profit.toFixed(2),
          record.vatableSales.toFixed(2),
          record.vatAmount.toFixed(2),
          record.note || '',
        ];

        rowData.forEach((cell, i) => {
          doc.text(String(cell), xPos + 1, yPos, { maxWidth: colWidths[i] - 2 });
          xPos += colWidths[i];
        });
        yPos += 6;
      });

      yPos += 4;
      doc.setFillColor(200, 200, 200);
      doc.rect(margin, yPos - 4, pageWidth - margin * 2, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);

      xPos = margin;
      colWidths.forEach((width, i) => {
        if (i === 0) doc.text('TOTALS', xPos + 1, yPos);
        else if (i === 7) doc.text(totals.revenue.toFixed(2), xPos + 1, yPos);
        else if (i === 8) doc.text(totals.cost.toFixed(2), xPos + 1, yPos);
        else if (i === 9) doc.text(totals.profit.toFixed(2), xPos + 1, yPos);
        else if (i === 10) doc.text(totals.vatableSales.toFixed(2), xPos + 1, yPos);
        else if (i === 11) doc.text(totals.vatAmount.toFixed(2), xPos + 1, yPos);
        xPos += width;
      });

      const fileName = `Voided_Sales_Report_${format(queryDates.from || new Date(), 'yyyyMMdd')}_${format(queryDates.to || new Date(), 'yyyyMMdd')}.pdf`;
      doc.save(fileName);
      toast({ title: 'PDF Exported', description: `Report saved as ${fileName}` });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({ title: 'Export Failed', description: 'Failed to generate PDF.', variant: 'destructive' });
    }
  };

  const { pageIndex, pageSize } = table.getState().pagination;
  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-destructive" />
                Post Void Report
              </CardTitle>
              <CardDescription>View and analyze all voided sales transactions</CardDescription>
            </div>
            <Badge variant="destructive" className="text-sm">
              {records.length} Voided Transaction{records.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[180px] justify-start text-left font-normal',
                      !fromDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[180px] justify-start text-left font-normal',
                      !toDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <Button
              onClick={() => {
                if (fromDate && toDate) setQueryDates({ from: fromDate, to: toDate });
              }}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Show Report'}
            </Button>

            <Button
              onClick={exportToPDF}
              disabled={isLoading || records.length === 0}
              variant="destructive"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export to PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <div className="h-4 w-4 flex items-center justify-center text-muted-foreground font-semibold text-base">₱</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totals.revenue)}</div>
            <p className="text-xs text-muted-foreground">Total voided sales amount</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totals.cost)}</div>
            <p className="text-xs text-muted-foreground">Total product cost</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', totals.profit >= 0 ? 'text-green-600' : 'text-red-600')}>
              {formatCurrency(totals.profit)}
            </div>
            <p className="text-xs text-muted-foreground">Revenue minus cost</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vatable Sales</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(totals.vatableSales)}</div>
            <p className="text-xs text-muted-foreground">Sales excluding VAT</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VAT Amount</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totals.vatAmount)}</div>
            <p className="text-xs text-muted-foreground">Total VAT collected</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction Details</CardTitle>
              <CardDescription>Detailed list of all voided sales transactions</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-9 w-[250px]"
                />
              </div>

              {viewMode === 'table' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Columns
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {table
                      .getAllColumns()
                      .filter((col) => col.getCanHide())
                      .map((col) => (
                        <DropdownMenuCheckboxItem
                          key={col.id}
                          className="capitalize"
                          checked={col.getIsVisible()}
                          onCheckedChange={(value) => col.toggleVisibility(!!value)}
                        >
                          {col.id.replace(/([A-Z])/g, ' $1').trim()}
                        </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-8 px-3"
                >
                  <TableIcon className="h-4 w-4 mr-1" />
                  Table
                </Button>
                <Button
                  variant={viewMode === 'card' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('card')}
                  className="h-8 px-3"
                >
                  <LayoutGrid className="h-4 w-4 mr-1" />
                  Cards
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className={viewMode === 'table' ? 'p-0 pb-0' : 'pt-0'}>
          {viewMode === 'card' ? (
            table.getRowModel().rows.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 p-4">
                {table.getRowModel().rows.map((row, index) => {
                  const record = row.original;
                  return (
                    <Card
                      key={row.id}
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md',
                        selectedRow === index && 'ring-2 ring-primary'
                      )}
                      onClick={() => setSelectedRow(index)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base text-primary">{record.refNo}</CardTitle>
                            <CardDescription className="text-xs">{record.siNo}</CardDescription>
                          </div>
                          <Badge variant="destructive">Voided</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground text-xs">Customer</span>
                            <p className="font-medium truncate" title={record.customer}>{record.customer}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Cashier</span>
                            <p className="font-medium">{record.cashier || '-'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground text-xs">Trans Date</span>
                            <p>{record.transDate ? format(new Date(record.transDate), 'MMM dd, yyyy') : '-'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Void Date</span>
                            <p>{record.voidDate ? format(new Date(record.voidDate), 'MMM dd, yyyy') : '-'}</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Amount</span>
                            <span className="font-mono font-semibold">{formatCurrency(record.salesAmount)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Cost</span>
                            <span className="font-mono text-muted-foreground">{formatCurrency(record.cost)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Profit</span>
                            <span className={cn('font-mono font-semibold', record.profit >= 0 ? 'text-green-600' : 'text-red-600')}>
                              {formatCurrency(record.profit)}
                            </span>
                          </div>
                        </div>
                        {record.note && (
                          <div className="pt-2 border-t">
                            <span className="text-muted-foreground text-xs">Note</span>
                            <p className="text-sm text-muted-foreground">{record.note}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 text-muted-foreground p-4">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading...
                  </div>
                ) : isError ? (
                  <span className="text-destructive">
                    Failed to load: {error instanceof Error ? error.message : 'Unknown error'}
                  </span>
                ) : (
                  'No voided sales found for the selected date range.'
                )}
              </div>
            )
          ) : (
            <div className="relative overflow-auto max-h-[600px] border-b">
              <Table className="w-full text-sm">
                <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="bg-muted/50 border-b hover:bg-muted/50">
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="py-2 px-2 whitespace-nowrap">
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row, index) => (
                      <TableRow
                        key={row.id}
                        className={cn(
                          'cursor-pointer hover:bg-muted/50 transition-colors text-xs',
                          (selectedRow === index || selectedIds.has(row.original.refNo)) && 'bg-muted'
                        )}
                        onClick={() => setSelectedRow(index)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-2 px-2">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={table.getVisibleLeafColumns().length}
                        className="h-24 text-center"
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            Loading...
                          </div>
                        ) : isError ? (
                          <span className="text-destructive">
                            Failed to load: {error instanceof Error ? error.message : 'Unknown error'}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            No voided sales found for the selected date range.
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredCount > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Showing {pageIndex * pageSize + 1} to{' '}
                  {Math.min((pageIndex + 1) * pageSize, filteredCount)} of {filteredCount} entries
                </span>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page:</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => table.setPageSize(Number(value))}
                  >
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-1 px-2">
                    <span className="text-sm font-medium">
                      Page {pageIndex + 1} of {table.getPageCount()}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
