'use client';

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
import { useMemo, useState, useEffect, Fragment } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Loader2,
  FileDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Columns,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TerminalSelector } from '@/components/TerminalSelector';
import { getApiUrl } from '@/lib/api-config';
import { useQuery } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table';

type ProductSalesData = {
  product: {
    id: string;
    name: string;
    sku: string;
    category: string;
    brand: string;
    unitOfMeasure: string;
  };
  unitsSold: number;
  totalRevenue: number;
  totalDiscount: number;
  totalCost: number;
  totalProfit: number;
  numberOfSales: number;
  avgPricePerUnit: number;
};

type TransactionData = {
  id: string;
  orderNumber: string;
  date: string;
  customer: { name: string };
  quantity: number;
  price: number;
  total: number;
  paymentMethod: string;
  cashier: string;
  items: any[];
};

function SortBtn({ column, children }: { column: any; children: React.ReactNode }) {
  return (
    <button
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      className="flex items-center gap-1 text-primary-foreground hover:bg-primary/80 px-1 py-0.5 rounded"
    >
      {children}
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

export default function SalesByProductPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [terminal, setTerminal] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(10);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [transactions, setTransactions] = useState<Record<string, TransactionData[]>>({});
  const [loadingTransactions, setLoadingTransactions] = useState<Record<string, boolean>>({});

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [cashierFilter, setCashierFilter] = useState<string>('all');
  const [referenceFilter, setReferenceFilter] = useState<string>('');

  const [dateRangeDialogOpen, setDateRangeDialogOpen] = useState(false);
  const [terminalDialogOpen, setTerminalDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [cashierDialogOpen, setCashierDialogOpen] = useState(false);
  const [referenceDialogOpen, setReferenceDialogOpen] = useState(false);

  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
  const [tempTerminal, setTempTerminal] = useState<string>('all');
  const [tempCategory, setTempCategory] = useState<string>('all');
  const [tempBrand, setTempBrand] = useState<string>('all');
  const [tempCashier, setTempCashier] = useState<string>('all');
  const [tempReference, setTempReference] = useState<string>('');

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const { data: attributesData } = useQuery({
    queryKey: ['productAttributes'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('/products/attributes'));
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: usersData } = useQuery({
    queryKey: ['cashiersForByProduct'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('/users'));
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const categories: string[] = attributesData?.success ? attributesData.categories : [];
  const brands: string[] = attributesData?.success ? attributesData.brands : [];
  const cashiers: { uid: string; displayName: string }[] = Array.isArray(usersData)
    ? usersData.map((u: any) => ({ uid: u.uid, displayName: u.displayName || u.email }))
    : [];

  const { data: productData, isLoading } = useQuery({
    queryKey: [
      'productSales',
      searchTerm,
      dateRange?.from?.toISOString(),
      dateRange?.to?.toISOString(),
      terminal,
      currentPage,
      limit,
      categoryFilter,
      brandFilter,
      cashierFilter,
      referenceFilter,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
      if (terminal && terminal !== 'all') params.append('terminalId', terminal);
      if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
      if (brandFilter && brandFilter !== 'all') params.append('brand', brandFilter);
      if (cashierFilter && cashierFilter !== 'all') params.append('cashier', cashierFilter);
      if (referenceFilter) params.append('reference', referenceFilter);
      params.append('page', currentPage.toString());
      params.append('limit', limit.toString());
      if (searchTerm) params.append('search', searchTerm);
      const res = await fetch(getApiUrl(`/sales/by-product?${params.toString()}`));
      return res.json();
    },
    placeholderData: (prev) => prev,
  });

  const productSales: ProductSalesData[] = productData?.success ? productData.data : [];

  useEffect(() => {
    if (productData?.success) {
      if (productData.pagination.totalPages !== totalPages)
        setTotalPages(productData.pagination.totalPages);
      if (productData.pagination.totalItems !== totalItems)
        setTotalItems(productData.pagination.totalItems);
    }
  }, [productData]);

  const resetFilters = () => {
    setSearchTerm('');
    setDateRange(undefined);
    setTerminal('all');
    setCategoryFilter('all');
    setBrandFilter('all');
    setCashierFilter('all');
    setReferenceFilter('');
    setCurrentPage(1);
  };

  const fetchAllProductSalesForExport = async () => {
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
    if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
    if (terminal && terminal !== 'all') params.append('terminalId', terminal);
    if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter);
    if (brandFilter && brandFilter !== 'all') params.append('brand', brandFilter);
    if (cashierFilter && cashierFilter !== 'all') params.append('cashier', cashierFilter);
    if (referenceFilter) params.append('reference', referenceFilter);
    if (searchTerm) params.append('search', searchTerm);
    params.append('limit', '1000000');
    try {
      const res = await fetch(getApiUrl(`/sales/by-product?${params.toString()}`));
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) return result.data;
      return [];
    } catch {
      return [];
    }
  };

  const exportToCSV = async () => {
    const data = await fetchAllProductSalesForExport();
    const headers = [
      'Code', 'Description', 'Category', 'Brand', 'UOM', 'Quantity',
      'Sales Discount', 'Sales Amount', 'Cost', 'Profit', 'Avg Price/Unit', 'No. of Sales',
    ];
    const csvRows = data.map((item: ProductSalesData) => [
      item.product.sku || '', item.product.name || '', item.product.category || '',
      item.product.brand || '', item.product.unitOfMeasure || '', item.unitsSold || 0,
      item.totalDiscount || 0, item.totalRevenue || 0, item.totalCost || 0,
      item.totalProfit || 0, item.avgPricePerUnit || 0, item.numberOfSales || 0,
    ]);
    const csvContent = [
      headers.join(','),
      ...csvRows.map((r: any[]) => r.map((c) => `"${c}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sales_by_product_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportToPDF = async () => {
    const data = await fetchAllProductSalesForExport();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const fmt = (val: any) =>
      parseFloat(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const printContent = `
      <html>
        <head>
          <title>Sales by Product Report</title>
          <style>
            body { font-family: sans-serif; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 4px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .text-right { text-align: right; }
            .summary-row { font-weight: bold; background-color: #f9f9f9; }
            h2 { margin-bottom: 10px; }
            p { margin: 5px 0; }
          </style>
        </head>
        <body>
          <h2>Sales by Product Report</h2>
          <p>Generated: ${format(new Date(), 'PPpp')}</p>
          <table>
            <thead>
              <tr>
                <th>Code</th><th>Description</th><th>Category/Brand</th>
                <th class="text-right">Quantity</th><th class="text-right">Sales Discount</th>
                <th class="text-right">Sales Amount</th><th class="text-right">Cost</th>
                <th class="text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (item: ProductSalesData) => `
                <tr>
                  <td>${item.product.sku || ''}</td>
                  <td>${item.product.name || ''}</td>
                  <td>${item.product.category || ''} / ${item.product.brand || ''}</td>
                  <td class="text-right">${item.unitsSold.toLocaleString()}</td>
                  <td class="text-right">${item.totalDiscount > 0 ? `(${fmt(item.totalDiscount)})` : '0.00'}</td>
                  <td class="text-right">${fmt(item.totalRevenue)}</td>
                  <td class="text-right">${fmt(item.totalCost)}</td>
                  <td class="text-right">${fmt(item.totalProfit)}</td>
                </tr>`
                )
                .join('')}
              <tr class="summary-row">
                <td colspan="3">TOTAL</td>
                <td class="text-right">${data.reduce((s: number, i: ProductSalesData) => s + i.unitsSold, 0).toLocaleString()}</td>
                <td class="text-right">${fmt(data.reduce((s: number, i: ProductSalesData) => s + i.totalDiscount, 0))}</td>
                <td class="text-right">${fmt(data.reduce((s: number, i: ProductSalesData) => s + i.totalRevenue, 0))}</td>
                <td class="text-right">${fmt(data.reduce((s: number, i: ProductSalesData) => s + i.totalCost, 0))}</td>
                <td class="text-right">${fmt(data.reduce((s: number, i: ProductSalesData) => s + i.totalProfit, 0))}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>`;
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(i); }} isActive={currentPage === i}>
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(1); }} isActive={currentPage === 1}>
            1
          </PaginationLink>
        </PaginationItem>
      );
      if (currentPage > 3) {
        items.push(<PaginationItem key="ellipsis-start"><PaginationEllipsis /></PaginationItem>);
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(i); }} isActive={currentPage === i}>
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
      if (currentPage < totalPages - 2) {
        items.push(<PaginationItem key="ellipsis-end"><PaginationEllipsis /></PaginationItem>);
      }
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(totalPages); }} isActive={currentPage === totalPages}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }
    return items;
  };

  const fetchTransactionsForProduct = async (productId: string) => {
    setLoadingTransactions((prev) => ({ ...prev, [productId]: true }));
    try {
      const params = new URLSearchParams();
      params.append('productId', productId);
      if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
      if (terminal && terminal !== 'all') params.append('terminalId', terminal);
      const res = await fetch(getApiUrl(`/sales/transactions?${params.toString()}`));
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const result = await res.json();
      if (result.success) {
        setTransactions((prev) => ({ ...prev, [productId]: result.data }));
      }
    } catch {
      // noop
    } finally {
      setLoadingTransactions((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const toggleRow = async (productId: string) => {
    const next = new Set(expandedRows);
    if (next.has(productId)) {
      next.delete(productId);
    } else {
      next.add(productId);
      if (!transactions[productId]) {
        await fetchTransactionsForProduct(productId);
      }
    }
    setExpandedRows(next);
  };

  const summaryTotals = productSales.reduce(
    (acc, item) => ({
      totalRevenue: acc.totalRevenue + item.totalRevenue,
      totalDiscount: acc.totalDiscount + item.totalDiscount,
      totalCost: acc.totalCost + item.totalCost,
      totalProfit: acc.totalProfit + item.totalProfit,
      unitsSold: acc.unitsSold + item.unitsSold,
    }),
    { totalRevenue: 0, totalDiscount: 0, totalCost: 0, totalProfit: 0, unitsSold: 0 }
  );

  const columns = useMemo<ColumnDef<ProductSalesData>[]>(
    () => [
      {
        id: 'expand',
        header: '',
        cell: ({ row }) => (
          <button
            onClick={() => toggleRow(row.original.product.id)}
            className="text-muted-foreground hover:text-primary"
          >
            {expandedRows.has(row.original.product.id) ? (
              <ChevronDown className="h-4 w-4 text-primary" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'sku',
        accessorFn: (row) => row.product.sku,
        header: 'Code',
        enableSorting: false,
        cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span>,
      },
      {
        id: 'name',
        accessorFn: (row) => row.product.name,
        header: ({ column }) => <SortBtn column={column}>Description</SortBtn>,
      },
      {
        id: 'categoryBrand',
        accessorFn: (row) => `${row.product.category} / ${row.product.brand}`,
        header: 'Category/Brand',
        enableSorting: false,
      },
      {
        id: 'unitsSold',
        accessorKey: 'unitsSold',
        header: ({ column }) => <SortBtn column={column}>Quantity</SortBtn>,
        cell: ({ getValue }) => (
          <span className="text-right block">{(getValue() as number).toLocaleString()}</span>
        ),
      },
      {
        id: 'totalDiscount',
        accessorKey: 'totalDiscount',
        header: ({ column }) => <SortBtn column={column}>Sales Discount</SortBtn>,
        cell: ({ getValue }) => {
          const v = getValue() as number;
          return (
            <span className={cn('text-right block', v > 0 && 'text-red-500')}>
              {v > 0
                ? `(${v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                : '0.00'}
            </span>
          );
        },
      },
      {
        id: 'totalRevenue',
        accessorKey: 'totalRevenue',
        header: ({ column }) => <SortBtn column={column}>Sales Amount</SortBtn>,
        cell: ({ getValue }) => (
          <span className="text-right block font-bold">
            {(getValue() as number).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        id: 'totalCost',
        accessorKey: 'totalCost',
        header: ({ column }) => <SortBtn column={column}>Cost</SortBtn>,
        cell: ({ getValue }) => (
          <span className="text-right block">
            {(getValue() as number).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
      },
      {
        id: 'totalProfit',
        accessorKey: 'totalProfit',
        header: ({ column }) => <SortBtn column={column}>Profit</SortBtn>,
        cell: ({ getValue }) => (
          <span className="text-right block font-bold text-green-600">
            {(getValue() as number).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
      },
    ],
    [expandedRows]
  );

  const table = useReactTable({
    data: productSales,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const activeFilterCount = [
    !!dateRange,
    terminal !== 'all',
    categoryFilter !== 'all',
    brandFilter !== 'all',
    cashierFilter !== 'all',
    !!referenceFilter,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Sales by Product/Service</CardTitle>
          <CardDescription>A summary of sales performance for each product.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-muted/50 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
              <p className="text-lg font-bold text-primary">
                ₱{summaryTotals.totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground font-medium">Total Discount</p>
              <p className="text-lg font-bold text-red-500">
                ₱{summaryTotals.totalDiscount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground font-medium">Total Cost</p>
              <p className="text-lg font-bold">
                ₱{summaryTotals.totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground font-medium">Total Profit</p>
              <p className="text-lg font-bold text-green-600">
                ₱{summaryTotals.totalProfit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground font-medium">Total Units Sold</p>
              <p className="text-lg font-bold">{summaryTotals.unitsSold.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4 mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by product name..."
                className="pl-8 sm:w-[300px]"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              {/* Column Visibility */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Columns className="h-4 w-4 mr-2" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {table
                    .getAllColumns()
                    .filter((col) => col.getCanHide())
                    .map((col) => (
                      <DropdownMenuCheckboxItem
                        key={col.id}
                        className="capitalize"
                        checked={col.getIsVisible()}
                        onCheckedChange={(val) => col.toggleVisibility(!!val)}
                      >
                        {col.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Export */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <FileDown className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={exportToCSV}>Export to CSV</DropdownMenuItem>
                  <DropdownMenuItem onSelect={exportToPDF}>Export to PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Filters */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filters
                    {activeFilterCount > 0 && (
                      <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                        {activeFilterCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onSelect={() => { setTempDateRange(dateRange); setDateRangeDialogOpen(true); }}
                  >
                    Date Range
                    {dateRange && <Badge variant="secondary" className="ml-auto text-xs">Set</Badge>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => { setTempTerminal(terminal); setTerminalDialogOpen(true); }}
                  >
                    Terminal
                    {terminal !== 'all' && <Badge variant="secondary" className="ml-auto text-xs">Set</Badge>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => { setTempCategory(categoryFilter); setCategoryDialogOpen(true); }}
                  >
                    Category
                    {categoryFilter !== 'all' && (
                      <Badge variant="secondary" className="ml-auto text-xs">{categoryFilter}</Badge>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => { setTempBrand(brandFilter); setBrandDialogOpen(true); }}
                  >
                    Brand
                    {brandFilter !== 'all' && (
                      <Badge variant="secondary" className="ml-auto text-xs">{brandFilter}</Badge>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => { setTempCashier(cashierFilter); setCashierDialogOpen(true); }}
                  >
                    Cashier
                    {cashierFilter !== 'all' && (
                      <Badge variant="secondary" className="ml-auto text-xs">{cashierFilter}</Badge>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => { setTempReference(referenceFilter); setReferenceDialogOpen(true); }}
                  >
                    Transaction Reference
                    {referenceFilter && <Badge variant="secondary" className="ml-auto text-xs">Set</Badge>}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={resetFilters} className="text-destructive">
                    Clear All Filters
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {(searchTerm || activeFilterCount > 0) && (
                <Button variant="ghost" onClick={resetFilters} size="sm">
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="text-muted-foreground">Loading sales data...</div>
            </div>
          ) : (
            <Table
              className="text-xs w-full"
              wrapperClassName="max-h-[530px] overflow-auto border rounded-md"
            >
              <TableHeader className="sticky top-0 z-30">
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="bg-primary hover:bg-primary border-b-0">
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={cn(
                          'bg-primary text-primary-foreground font-semibold',
                          header.column.id === 'expand' && 'w-[50px]',
                          ['unitsSold', 'totalDiscount', 'totalRevenue', 'totalCost', 'totalProfit'].includes(
                            header.column.id
                          ) && 'text-right'
                        )}
                      >
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
                    <Fragment key={row.original.product.id}>
                      <TableRow
                        className={cn(
                          'cursor-pointer hover:bg-accent',
                          index % 2 === 0 ? 'bg-background' : 'bg-muted/50'
                        )}
                        onClick={() => toggleRow(row.original.product.id)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                      {expandedRows.has(row.original.product.id) && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={table.getVisibleLeafColumns().length} className="p-0">
                            <div className="p-4 pl-12">
                              <h4 className="font-semibold mb-2">Transaction History</h4>
                              {loadingTransactions[row.original.product.id] ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                  <Loader2 className="h-4 w-4 animate-spin" /> Loading transactions...
                                </div>
                              ) : (
                                <div className="overflow-x-auto border rounded-md bg-background">
                                  <Table className="text-xs">
                                    <TableHeader>
                                      <TableRow className="bg-muted hover:bg-muted">
                                        <TableHead className="font-semibold">Date</TableHead>
                                        <TableHead className="font-semibold">Order #</TableHead>
                                        <TableHead className="font-semibold">Customer</TableHead>
                                        <TableHead className="font-semibold text-right">Qty</TableHead>
                                        <TableHead className="font-semibold text-right">Price</TableHead>
                                        <TableHead className="font-semibold text-right">Total</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {transactions[row.original.product.id]?.length > 0 ? (
                                        transactions[row.original.product.id].map((tx: any) => {
                                          const productItem = tx.items.find(
                                            (i: any) => i.productId === row.original.product.id
                                          );
                                          return (
                                            <TableRow
                                              key={tx.posTransactionId}
                                              className="hover:bg-muted/50 border-0"
                                            >
                                              <TableCell>
                                                {format(new Date(tx.date), 'MMM dd, yyyy HH:mm')}
                                              </TableCell>
                                              <TableCell>{tx.orderNumber || tx.receiptNo}</TableCell>
                                              <TableCell>{tx.customer?.name}</TableCell>
                                              <TableCell className="text-right">
                                                {productItem?.quantity || 0}
                                              </TableCell>
                                              <TableCell className="text-right">
                                                {parseFloat(productItem?.price || 0).toFixed(2)}
                                              </TableCell>
                                              <TableCell className="text-right">
                                                {parseFloat(productItem?.total || 0).toFixed(2)}
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })
                                      ) : (
                                        <TableRow>
                                          <TableCell
                                            colSpan={6}
                                            className="text-center text-muted-foreground py-4"
                                          >
                                            No transaction details available.
                                          </TableCell>
                                        </TableRow>
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={table.getVisibleLeafColumns().length}
                      className="text-center h-24"
                    >
                      No products found for the selected criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        <div className="py-4 border-t px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 order-2 sm:order-1">
            <Label htmlFor="rows-per-page" className="text-xs text-muted-foreground whitespace-nowrap">
              Rows per page
            </Label>
            <Select
              value={limit.toString()}
              onValueChange={(v) => { setLimit(Number(v)); setCurrentPage(1); }}
            >
              <SelectTrigger id="rows-per-page" className="h-8 w-[70px] text-xs">
                <SelectValue placeholder={limit.toString()} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="order-1 sm:order-2">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage(currentPage - 1); }}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                {renderPaginationItems()}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) setCurrentPage(currentPage + 1); }}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </Card>

      {/* Date Range Filter Dialog */}
      <Dialog open={dateRangeDialogOpen} onOpenChange={setDateRangeDialogOpen}>
        <DialogContent className="sm:max-w-fit max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filter by Date Range</DialogTitle>
            <DialogDescription>Select a date range to filter sales data.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>Date Range</Label>
            <div className="mt-2 flex justify-center">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={tempDateRange?.from}
                selected={tempDateRange}
                onSelect={setTempDateRange}
                numberOfMonths={1}
                className="rounded-md border"
              />
            </div>
            {tempDateRange?.from && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                {tempDateRange.to ? (
                  <>Selected: {format(tempDateRange.from, 'LLL dd, y')} - {format(tempDateRange.to, 'LLL dd, y')}</>
                ) : (
                  <>Selected: {format(tempDateRange.from, 'LLL dd, y')}</>
                )}
              </p>
            )}
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setTempDateRange(undefined)}>Clear Date</Button>
            <Button variant="outline" size="sm" onClick={() => setDateRangeDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { setDateRange(tempDateRange); setDateRangeDialogOpen(false); }}>
              Apply Filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminal Filter Dialog */}
      <Dialog open={terminalDialogOpen} onOpenChange={setTerminalDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filter by Terminal</DialogTitle>
            <DialogDescription>Select the terminal to filter sales data.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="terminal">Terminal</Label>
            <div className="mt-2">
              <TerminalSelector
                terminalId={tempTerminal}
                onTerminalChange={setTempTerminal}
                showAllOption={true}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTerminalDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setTerminal(tempTerminal); setTerminalDialogOpen(false); }}>Apply Filter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Filter Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filter by Category</DialogTitle>
            <DialogDescription>Select the category to filter products.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="category">Category</Label>
            <Select value={tempCategory} onValueChange={setTempCategory}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setCategoryFilter(tempCategory); setCategoryDialogOpen(false); }}>Apply Filter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Brand Filter Dialog */}
      <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filter by Brand</DialogTitle>
            <DialogDescription>Select the brand to filter products.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="brand">Brand</Label>
            <Select value={tempBrand} onValueChange={setTempBrand}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrandDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setBrandFilter(tempBrand); setBrandDialogOpen(false); }}>Apply Filter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cashier Filter Dialog */}
      <Dialog open={cashierDialogOpen} onOpenChange={setCashierDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filter by Cashier</DialogTitle>
            <DialogDescription>Select the cashier to filter sales data.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="cashier">Cashier</Label>
            <Select value={tempCashier} onValueChange={setTempCashier}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select cashier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cashiers</SelectItem>
                {cashiers.map((c) => (
                  <SelectItem key={c.uid} value={c.displayName}>{c.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCashierDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setCashierFilter(tempCashier); setCashierDialogOpen(false); }}>Apply Filter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Reference Filter Dialog */}
      <Dialog open={referenceDialogOpen} onOpenChange={setReferenceDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filter by Transaction Reference</DialogTitle>
            <DialogDescription>Enter a transaction reference number to filter.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reference">Transaction Reference</Label>
            <Input
              id="reference"
              className="mt-2"
              placeholder="Order #, Invoice #..."
              value={tempReference}
              onChange={(e) => setTempReference(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReferenceDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setReferenceFilter(tempReference); setReferenceDialogOpen(false); }}>
              Apply Filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
