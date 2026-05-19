'use client';

import { useState, Fragment, useMemo } from 'react';
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import {
  Search,
  X,
  Loader2,
  SlidersHorizontal,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns,
} from 'lucide-react';
import { TerminalSelector } from '@/components/TerminalSelector';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

function SortBtn({ column, label }: { column: any; label: string }) {
  return (
    <Button variant="ghost" size="sm" className="h-8 -ml-3 text-primary-foreground hover:text-primary-foreground hover:bg-primary/80 font-semibold"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
      {label}
      {column.getIsSorted() === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : column.getIsSorted() === 'desc' ? <ArrowDown className="ml-1 h-3 w-3" /> : <ArrowUpDown className="ml-1 h-3 w-3 opacity-60" />}
    </Button>
  );
}

export default function SalesDetailsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [terminalId, setTerminalId] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');
  const [salesStatusFilter, setSalesStatusFilter] = useState<string>('all');
  const [paymentTypeDialogOpen, setPaymentTypeDialogOpen] = useState(false);
  const [terminalDialogOpen, setTerminalDialogOpen] = useState(false);
  const [dateRangeDialogOpen, setDateRangeDialogOpen] = useState(false);
  const [tempPaymentType, setTempPaymentType] = useState<string>('all');
  const [tempTerminalId, setTempTerminalId] = useState<string>('all');
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);

  const { data: salesResult, isLoading } = useQuery({
    queryKey: ['salesDetails', dateRange?.from?.toISOString(), dateRange?.to?.toISOString(), terminalId, currentPage, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
      if (terminalId && terminalId !== 'all') params.append('terminalId', terminalId);
      params.append('page', currentPage.toString());
      params.append('limit', limit.toString());
      const res = await fetch(`/api/sales/transactions?${params.toString()}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Failed to fetch sales');
      return result;
    },
    placeholderData: (prev) => prev,
  });

  const sales: any[] = salesResult?.data || [];
  const paginationMeta = salesResult?.pagination;
  const totalPages = paginationMeta?.totalPages ?? 1;

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) { newSet.delete(id); } else { newSet.add(id); }
      return newSet;
    });
  };

  const filteredSales = useMemo(() => sales.filter(sale => {
    if (searchTerm) {
      const t = searchTerm.toLowerCase();
      if (!String(sale.id || sale.posTransactionId).toLowerCase().includes(t) && !sale.customer?.name?.toLowerCase().includes(t)) return false;
    }
    if (paymentTypeFilter !== 'all' && sale.paymentMethod !== paymentTypeFilter) return false;
    if (salesStatusFilter !== 'all') {
      const st = sale.status || (sale.paymentStatus === 'completed' ? 'Paid' : 'Pending');
      if (st !== salesStatusFilter) return false;
    }
    return true;
  }), [sales, searchTerm, paymentTypeFilter, salesStatusFilter]);

  const formatAmount = (val: any) => Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      id: 'expand',
      enableSorting: false,
      enableHiding: false,
      header: () => null,
      cell: ({ row }) => {
        const rowId = row.original.posTransactionId || row.original.id;
        return expandedRows.has(rowId) ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />;
      },
    },
    {
      accessorKey: 'orderNumber',
      header: ({ column }) => <SortBtn column={column} label="SO No." />,
      cell: ({ row }) => <span className="font-medium text-primary whitespace-nowrap">{row.original.orderNumber || '-'}</span>,
    },
    {
      accessorKey: 'receiptNo',
      header: ({ column }) => <SortBtn column={column} label="Receipt" />,
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.receiptNo || row.original.orderNumber || '-'}</span>,
    },
    {
      accessorKey: 'date',
      header: ({ column }) => <SortBtn column={column} label="Date" />,
      cell: ({ row }) => {
        const d = row.original.date;
        return <span className="whitespace-nowrap">{d ? format(new Date(d), 'MMM dd, yyyy HH:mm') : '-'}</span>;
      },
    },
    {
      accessorKey: 'terminal',
      header: ({ column }) => <SortBtn column={column} label="Terminal" />,
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.terminal || '-'}</span>,
    },
    {
      accessorKey: 'cashier',
      header: ({ column }) => <SortBtn column={column} label="Cashier" />,
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.cashier || '-'}</span>,
    },
    {
      id: 'customer',
      accessorFn: (row) => row.customer?.name || 'Walk-in',
      header: ({ column }) => <SortBtn column={column} label="Customer" />,
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.customer?.name || 'Walk-in'}</span>,
    },
    {
      accessorKey: 'total',
      header: ({ column }) => (
        <div className="text-right"><SortBtn column={column} label="Amount" /></div>
      ),
      cell: ({ row }) => <div className="text-right font-medium whitespace-nowrap">{formatAmount(row.original.total)}</div>,
    },
    {
      accessorKey: 'paymentMethod',
      header: ({ column }) => <SortBtn column={column} label="Payment" />,
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.paymentMethod || '-'}</span>,
    },
    {
      id: 'status',
      accessorFn: (row) => row.paymentStatus || row.status,
      header: ({ column }) => <SortBtn column={column} label="Status" />,
      cell: ({ row }) => {
        const isPaid = row.original.paymentStatus === 'completed' || row.original.status === 'Paid';
        return <Badge variant={isPaid ? 'default' : 'destructive'} className="font-normal">{isPaid ? 'Paid' : row.original.status || 'Pending'}</Badge>;
      },
    },
  ], [expandedRows]);

  const table = useReactTable({
    data: filteredSales,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const handlePageChange = (page: number) => { if (page >= 1 && page <= totalPages) setCurrentPage(page); };

  const resetFilters = () => {
    setSearchTerm(''); setDateRange(undefined); setTerminalId('all');
    setPaymentTypeFilter('all'); setSalesStatusFilter('all');
    setCurrentPage(1); setExpandedRows(new Set());
  };

  const hasActiveFilters = searchTerm || dateRange || terminalId !== 'all' || paymentTypeFilter !== 'all' || salesStatusFilter !== 'all';

  const summaryTotals = sales.reduce((acc, sale) => {
    const totalAmount = Number(sale.total || 0);
    const costAmount = Number(sale.cost || 0);
    const taxAmount = Number(sale.taxAmount || 0);
    return {
      discounts: acc.discounts + Number(sale.discount || 0),
      revenue: acc.revenue + totalAmount,
      amountPaid: acc.amountPaid + Number(sale.amountPaid || totalAmount),
      customerBalance: acc.customerBalance + Number(sale.balance || 0),
      cost: acc.cost + costAmount,
      grossProfit: acc.grossProfit + (totalAmount - costAmount - taxAmount),
      vatableSales: acc.vatableSales + Number(sale.vatableSales || 0),
      vatAmount: acc.vatAmount + taxAmount,
      nonVatSales: acc.nonVatSales + Number(sale.nonVatSales || 0),
      accountPayments: acc.accountPayments + (sale.paymentMethod === 'Account' ? totalAmount : 0),
    };
  }, { discounts: 0, revenue: 0, amountPaid: 0, customerBalance: 0, cost: 0, grossProfit: 0, vatableSales: 0, vatAmount: 0, nonVatSales: 0, accountPayments: 0 });

  const fetchAllSalesForExport = async () => {
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
    if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
    if (terminalId && terminalId !== 'all') params.append('terminalId', terminalId);
    params.append('limit', '1000000');
    try {
      const res = await fetch(`/api/sales/transactions?${params.toString()}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result = await res.json();
      return result.success && Array.isArray(result.data) ? result.data : [];
    } catch { return []; }
  };

  const exportToCSV = async () => {
    const data = await fetchAllSalesForExport();
    const rows = data.flatMap((sale: any) => {
      const items = sale.items || [];
      if (items.length === 0) return [{ ...sale, itemName: 'No Items', itemCost: 0, itemPrice: 0, itemQty: 0, itemTotal: 0 }];
      return items.map((item: any) => ({ ...sale, ...item, itemName: item.productName, itemCost: item.cost, itemPrice: item.price, itemQty: item.quantity, itemTotal: item.total }));
    });
    const headers = ['SO No.', 'Receipt No.', 'Date', 'Terminal', 'Cashier', 'Customer', 'Description', 'Cost', 'Price', 'Quantity', 'Discount', 'Amount Due', 'Profit', 'Payment Type', 'Note'];
    const csvRows = rows.map((row: any) => [row.orderNumber || '', row.receiptNo || row.orderNumber || '', row.date ? format(new Date(row.date), 'yyyy-MM-dd HH:mm') : '', row.terminal || '', row.cashier || '', row.customer?.name || 'Walk-in', row.itemName || 'General Item', row.itemCost || 0, row.itemPrice || 0, row.itemQty || 1, row.discount || 0, row.itemTotal || row.total || 0, (row.itemTotal || 0) - ((row.itemCost || 0) * (row.itemQty || 1)), row.paymentMethod || '', row.notes || '']);
    const csv = [headers.join(','), ...csvRows.map((r: any[]) => r.map(c => `"${c}"`).join(','))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `sales_details_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportToPDF = async () => {
    const data = await fetchAllSalesForExport();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const printContent = `<html><head><title>Sales Details Report</title><style>body{font-family:sans-serif;font-size:10px;}table{width:100%;border-collapse:collapse;margin-bottom:20px;}th,td{border:1px solid #ddd;padding:4px;text-align:left;}th{background-color:#f2f2f2;font-weight:bold;}.text-right{text-align:right;}.sub-table{margin:10px;width:95%;background-color:#fafafa;}.sub-table th{background-color:#eee;}.summary-row{font-weight:bold;background-color:#f9f9f9;}</style></head><body><h2>Sales Details Report</h2><p>Generated: ${format(new Date(), 'PPpp')}</p><table><thead><tr><th>SO No.</th><th>Date</th><th>Customer</th><th>Payment Type</th><th>Total Amount</th></tr></thead><tbody>${data.map((sale: any) => `<tr class="summary-row"><td>${sale.orderNumber || ''}</td><td>${sale.date ? format(new Date(sale.date), 'MM/dd/yyyy HH:mm') : ''}</td><td>${sale.customer?.name || 'Walk-in'}</td><td>${sale.paymentMethod || '-'}</td><td class="text-right">${formatAmount(sale.total)}</td></tr><tr><td colspan="5"><table class="sub-table"><thead><tr><th>Description</th><th class="text-right">Cost</th><th class="text-right">Price</th><th class="text-right">Qty</th><th class="text-right">Total</th></tr></thead><tbody>${(sale.items || []).map((item: any) => `<tr><td>${item.productName}</td><td class="text-right">${formatAmount(item.cost)}</td><td class="text-right">${formatAmount(item.price)}</td><td class="text-right">${item.quantity}</td><td class="text-right">${formatAmount(item.total)}</td></tr>`).join('')}</tbody></table></td></tr>`).join('')}</tbody></table></body></html>`;
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const renderPaginationItems = () => {
    const items = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) items.push(<PaginationItem key={i}><PaginationLink isActive={currentPage === i} onClick={() => handlePageChange(i)}>{i}</PaginationLink></PaginationItem>);
    } else {
      items.push(<PaginationItem key={1}><PaginationLink isActive={currentPage === 1} onClick={() => handlePageChange(1)}>1</PaginationLink></PaginationItem>);
      if (currentPage > 3) items.push(<PaginationItem key="e1"><PaginationEllipsis /></PaginationItem>);
      const start = Math.max(2, currentPage - 1), end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) items.push(<PaginationItem key={i}><PaginationLink isActive={currentPage === i} onClick={() => handlePageChange(i)}>{i}</PaginationLink></PaginationItem>);
      if (currentPage < totalPages - 2) items.push(<PaginationItem key="e2"><PaginationEllipsis /></PaginationItem>);
      items.push(<PaginationItem key={totalPages}><PaginationLink isActive={currentPage === totalPages} onClick={() => handlePageChange(totalPages)}>{totalPages}</PaginationLink></PaginationItem>);
    }
    return items;
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Sales Details</CardTitle>
                <CardDescription>Detailed view of sales items and transactions.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
              <div className="bg-muted/50 rounded-lg p-3 border"><p className="text-xs text-muted-foreground font-medium">Discounts</p><p className="text-lg font-bold">₱{summaryTotals.discounts.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></div>
              <div className="bg-muted/50 rounded-lg p-3 border"><p className="text-xs text-muted-foreground font-medium">Revenue</p><p className="text-lg font-bold text-primary">₱{summaryTotals.revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></div>
              <div className="bg-muted/50 rounded-lg p-3 border"><p className="text-xs text-muted-foreground font-medium">Amount Paid</p><p className="text-lg font-bold">₱{summaryTotals.amountPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></div>
              <div className="bg-muted/50 rounded-lg p-3 border"><p className="text-xs text-muted-foreground font-medium">Customer Balance</p><p className="text-lg font-bold">₱{summaryTotals.customerBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></div>
              <div className="bg-muted/50 rounded-lg p-3 border"><p className="text-xs text-muted-foreground font-medium">Cost</p><p className="text-lg font-bold">₱{summaryTotals.cost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></div>
              <div className="bg-muted/50 rounded-lg p-3 border"><p className="text-xs text-muted-foreground font-medium">Gross Profit</p><p className="text-lg font-bold text-green-600">₱{summaryTotals.grossProfit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></div>
              <div className="bg-muted/50 rounded-lg p-3 border"><p className="text-xs text-muted-foreground font-medium">Vatable Sales</p><p className="text-lg font-bold">₱{summaryTotals.vatableSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></div>
              <div className="bg-muted/50 rounded-lg p-3 border"><p className="text-xs text-muted-foreground font-medium">VAT Amount</p><p className="text-lg font-bold">₱{summaryTotals.vatAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></div>
              <div className="bg-muted/50 rounded-lg p-3 border"><p className="text-xs text-muted-foreground font-medium">Non-Vat Sales</p><p className="text-lg font-bold">₱{summaryTotals.nonVatSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></div>
              <div className="bg-muted/50 rounded-lg p-3 border"><p className="text-xs text-muted-foreground font-medium">Account Payments</p><p className="text-lg font-bold">₱{summaryTotals.accountPayments.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p></div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search by ID or customer..." className="pl-8 w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      Filters
                      {hasActiveFilters && <Badge variant="secondary" className="ml-2 h-5 px-1.5">!</Badge>}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onSelect={() => { setTempPaymentType(paymentTypeFilter); setPaymentTypeDialogOpen(true); }}>Payment Type</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempTerminalId(terminalId); setTerminalDialogOpen(true); }}>Terminal</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempDateRange(dateRange); setDateRangeDialogOpen(true); }}>Date Range</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={resetFilters} className="text-destructive">Clear All Filters</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm"><Columns className="h-4 w-4 mr-2" />Columns</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {table.getAllColumns().filter(col => col.getCanHide()).map(col => (
                      <DropdownMenuCheckboxItem key={col.id} className="capitalize" checked={col.getIsVisible()} onCheckedChange={val => col.toggleVisibility(!!val)}>
                        {col.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={exportToCSV}><FileSpreadsheet className="h-4 w-4 mr-2" />Export as CSV</DropdownMenuItem>
                    <DropdownMenuItem onSelect={exportToPDF}><FileText className="h-4 w-4 mr-2" />Export as PDF</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {hasActiveFilters && <Button variant="ghost" onClick={resetFilters} size="sm"><X className="h-4 w-4 mr-1" />Clear</Button>}
              </div>
            </div>

            {/* Main Table */}
            <Table className="text-xs w-full" wrapperClassName="max-h-[440px] overflow-auto border rounded-md">
              <TableHeader className="sticky top-0 z-30">
                {table.getHeaderGroups().map(hg => (
                  <TableRow key={hg.id} className="bg-primary hover:bg-primary border-b-0">
                    {hg.headers.map(header => (
                      <TableHead key={header.id} className={cn('bg-primary text-primary-foreground font-semibold py-2 px-2', header.column.id === 'expand' && 'w-8', header.column.id === 'total' && 'text-right')}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={columns.length} className="h-24 text-center"><div className="flex justify-center items-center"><Loader2 className="h-6 w-6 animate-spin mr-2" />Loading transactions...</div></TableCell></TableRow>
                ) : table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row, index) => {
                    const sale = row.original;
                    const rowId = sale.posTransactionId || sale.id;
                    const isExpanded = expandedRows.has(rowId);
                    return (
                      <Fragment key={rowId}>
                        <TableRow
                          className={`cursor-pointer hover:bg-accent ${index % 2 === 0 ? 'bg-background' : 'bg-muted/50'}`}
                          onClick={() => toggleRowExpansion(rowId)}
                        >
                          {row.getVisibleCells().map(cell => (
                            <TableCell key={cell.id} className="py-2 px-2">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>

                        {isExpanded && (
                          <TableRow key={`${rowId}-details`} className="bg-muted/30">
                            <TableCell colSpan={row.getVisibleCells().length} className="py-3 px-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-10 gap-4 text-xs mb-4">
                                <div className="flex flex-col"><span className="text-muted-foreground font-medium">Discount</span><span className="font-semibold">{formatAmount(sale.discount)}</span></div>
                                <div className="flex flex-col"><span className="text-muted-foreground font-medium">Amount Paid</span><span className="font-semibold">{formatAmount(sale.amountPaid || sale.total)}</span></div>
                                <div className="flex flex-col"><span className="text-muted-foreground font-medium">Balance</span><span className="font-semibold">{formatAmount(sale.balance)}</span></div>
                                <div className="flex flex-col"><span className="text-muted-foreground font-medium">Cost</span><span className="font-semibold">{formatAmount(sale.cost)}</span></div>
                                <div className="flex flex-col"><span className="text-muted-foreground font-medium">Profit</span><span className="font-semibold">{formatAmount(sale.profit)}</span></div>
                                <div className="flex flex-col"><span className="text-muted-foreground font-medium">Vatable Sales</span><span className="font-semibold">{formatAmount(sale.vatableSales)}</span></div>
                                <div className="flex flex-col"><span className="text-muted-foreground font-medium">VAT Amount</span><span className="font-semibold">{formatAmount(sale.taxAmount)}</span></div>
                                <div className="flex flex-col"><span className="text-muted-foreground font-medium">Non-Vat Sales</span><span className="font-semibold">{formatAmount(sale.nonVatSales)}</span></div>
                                <div className="flex flex-col"><span className="text-muted-foreground font-medium">Payment Ref.</span><span className="font-semibold">{sale.paymentReference || '-'}</span></div>
                                <div className="flex flex-col"><span className="text-muted-foreground font-medium">Note</span><span className="font-semibold">{sale.notes || '-'}</span></div>
                              </div>
                              <div className="border rounded-md bg-background/50 overflow-hidden">
                                <Table className="text-xs">
                                  <TableHeader>
                                    <TableRow className="bg-muted hover:bg-muted border-b border-border/50">
                                      <TableHead className="py-2 h-8 font-semibold">Description</TableHead>
                                      <TableHead className="py-2 h-8 font-semibold text-right">Cost</TableHead>
                                      <TableHead className="py-2 h-8 font-semibold text-right">Price</TableHead>
                                      <TableHead className="py-2 h-8 font-semibold text-center">Qty</TableHead>
                                      <TableHead className="py-2 h-8 font-semibold text-right">Discount</TableHead>
                                      <TableHead className="py-2 h-8 font-semibold text-right">Amount Due</TableHead>
                                      <TableHead className="py-2 h-8 font-semibold text-right text-muted-foreground">Profit</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {(sale.items && sale.items.length > 0) ? (
                                      sale.items.map((item: any) => {
                                        const profit = (item.total || 0) - ((item.cost || 0) * (item.quantity || 1));
                                        return (
                                          <TableRow key={item.id} className="hover:bg-muted/30">
                                            <TableCell className="py-2">{item.productName || item.description || 'Item'}</TableCell>
                                            <TableCell className="py-2 text-right text-muted-foreground">{formatAmount(item.cost)}</TableCell>
                                            <TableCell className="py-2 text-right">{formatAmount(item.price)}</TableCell>
                                            <TableCell className="py-2 text-center">{item.quantity}</TableCell>
                                            <TableCell className="py-2 text-right text-red-500">{item.discount > 0 ? `-${formatAmount(item.discount)}` : '-'}</TableCell>
                                            <TableCell className="py-2 text-right font-medium">{formatAmount(item.total)}</TableCell>
                                            <TableCell className="py-2 text-right text-green-600/80">{formatAmount(profit)}</TableCell>
                                          </TableRow>
                                        );
                                      })
                                    ) : (
                                      <TableRow><TableCell colSpan={7} className="text-center py-4 text-muted-foreground">No item details available</TableCell></TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                ) : (
                  <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">No transactions found for the selected criteria.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {!isLoading && sales.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 order-2 sm:order-1">
                  <Label htmlFor="rows-per-page" className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</Label>
                  <Select value={limit.toString()} onValueChange={(v) => { setLimit(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger id="rows-per-page" className="h-8 w-[70px] text-xs"><SelectValue placeholder={limit.toString()} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem><SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="order-1 sm:order-2">
                  <Pagination><PaginationContent>
                    <PaginationItem><PaginationPrevious onClick={() => handlePageChange(Math.max(1, currentPage - 1))} aria-disabled={currentPage === 1} className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} /></PaginationItem>
                    {renderPaginationItems()}
                    <PaginationItem><PaginationNext onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} aria-disabled={currentPage === totalPages} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} /></PaginationItem>
                  </PaginationContent></Pagination>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter Dialogs */}
      <Dialog open={paymentTypeDialogOpen} onOpenChange={setPaymentTypeDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Filter by Payment Type</DialogTitle><DialogDescription className="sr-only">Filter sales transactions by payment type</DialogDescription></DialogHeader>
          <div className="py-4"><Label>Payment Type</Label><Select value={tempPaymentType} onValueChange={setTempPaymentType}><SelectTrigger className="mt-2"><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Card">Card</SelectItem><SelectItem value="GCash">GCash</SelectItem><SelectItem value="Maya">Maya</SelectItem><SelectItem value="Bank Transfer">Bank Transfer</SelectItem><SelectItem value="Account">Account</SelectItem></SelectContent></Select></div>
          <DialogFooter><Button onClick={() => { setPaymentTypeFilter(tempPaymentType); setPaymentTypeDialogOpen(false); }}>Apply</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={terminalDialogOpen} onOpenChange={setTerminalDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Filter by Terminal</DialogTitle><DialogDescription className="sr-only">Filter sales transactions by POS terminal</DialogDescription></DialogHeader>
          <div className="py-4"><TerminalSelector terminalId={tempTerminalId} onTerminalChange={setTempTerminalId} showAllOption={true} /></div>
          <DialogFooter><Button onClick={() => { setTerminalId(tempTerminalId); setTerminalDialogOpen(false); }}>Apply</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dateRangeDialogOpen} onOpenChange={setDateRangeDialogOpen}>
        <DialogContent className="sm:max-w-fit">
          <DialogHeader><DialogTitle>Filter by Date</DialogTitle><DialogDescription className="sr-only">Filter sales transactions by date range</DialogDescription></DialogHeader>
          <div className="py-2 flex justify-center"><Calendar mode="range" selected={tempDateRange} onSelect={setTempDateRange} numberOfMonths={1} className="rounded-md border" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTempDateRange(undefined)}>Clear</Button>
            <Button onClick={() => { setDateRange(tempDateRange); setDateRangeDialogOpen(false); }}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
