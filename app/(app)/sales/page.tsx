'use client';

import { useState, useEffect, Fragment } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { CalendarIcon, Search, X, Loader2, ChevronDown, ChevronUp, Filter, SlidersHorizontal, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { TerminalSelector } from '@/components/TerminalSelector';
import { getApiUrl } from '@/lib/api-config';
import {
  DropdownMenu,
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

export default function SalesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [terminalId, setTerminalId] = useState<string>('all');
  const [sales, setSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(10); // Number of items per page

  // Filter states
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');
  const [salesStatusFilter, setSalesStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [cashierFilter, setCashierFilter] = useState<string>('all');
  const [salesGroupFilter, setSalesGroupFilter] = useState<string>('all');
  const [referenceNumberFilter, setReferenceNumberFilter] = useState<string>('');
  const [transactionFromFilter, setTransactionFromFilter] = useState<string>('all');

  // Filter dialog open states
  const [paymentTypeDialogOpen, setPaymentTypeDialogOpen] = useState(false);
  const [terminalDialogOpen, setTerminalDialogOpen] = useState(false);
  const [dateRangeDialogOpen, setDateRangeDialogOpen] = useState(false);
  const [salesStatusDialogOpen, setSalesStatusDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [cashierDialogOpen, setCashierDialogOpen] = useState(false);
  const [salesGroupDialogOpen, setSalesGroupDialogOpen] = useState(false);
  const [referenceNumberDialogOpen, setReferenceNumberDialogOpen] = useState(false);
  const [transactionFromDialogOpen, setTransactionFromDialogOpen] = useState(false);

  // Temporary filter values for dialogs
  const [tempPaymentType, setTempPaymentType] = useState<string>('all');
  const [tempTerminalId, setTempTerminalId] = useState<string>('all');
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
  const [tempSalesStatus, setTempSalesStatus] = useState<string>('all');
  const [tempCustomer, setTempCustomer] = useState<string>('');
  const [tempCashier, setTempCashier] = useState<string>('');
  const [tempSalesGroup, setTempSalesGroup] = useState<string>('all');
  const [tempReferenceNumber, setTempReferenceNumber] = useState<string>('');
  const [tempTransactionFrom, setTempTransactionFrom] = useState<string>('all');

  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const fetchSales = async (page = 1) => {
    setIsLoading(true);
    try {
        const params = new URLSearchParams();
        if (dateRange?.from) {
            params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
        }
        if (dateRange?.to) {
            params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
        }
        if (terminalId && terminalId !== 'all') {
            params.append('terminalId', terminalId);
        }
        
        // Add pagination params
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        
        const response = await fetch(getApiUrl(`/sales/transactions?${params.toString()}`));
        const result = await response.json();
        
        if (result.success) {
            setSales(result.data);
            if (result.pagination) {
                setTotalPages(result.pagination.totalPages);
                setCurrentPage(result.pagination.page);
            }
        } else {
            console.error("Failed to fetch sales:", result.error);
        }
    } catch (error) {
        console.error("Error fetching sales:", error);
    } finally {
        setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (Array.isArray(data)) {
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchSales(currentPage);
  }, [dateRange, terminalId, currentPage, limit]);

  // Reset to page 1 when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [dateRange, terminalId, limit]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
    }
  };

  const getStatusInfo = (status: string): { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    switch (status) {
      case 'Paid':
        return { text: 'Paid', variant: 'default' };
      case 'Failed':
      case 'Returned':
      case 'Void':
      case 'Voided':
        return { text: status, variant: 'destructive' };
      case 'Shipped':
      case 'Delivered':
        return { text: status, variant: 'outline' };
      case 'Pending':
      default:
        return { text: 'Due', variant: 'secondary' };
    }
  };

  const filteredSales = sales.filter(sale => {
      // Search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const idMatch = String(sale.id || sale.posTransactionId).toLowerCase().includes(term);
        const customerMatch = sale.customer?.name?.toLowerCase().includes(term);
        if (!idMatch && !customerMatch) return false;
      }
      
      // Payment type filter
      if (paymentTypeFilter !== 'all' && sale.paymentMethod !== paymentTypeFilter) {
        return false;
      }
      
      // Sales status filter
      if (salesStatusFilter !== 'all') {
        const saleStatus = sale.status || (sale.paymentStatus === 'completed' ? 'Paid' : 'Pending');
        if (saleStatus !== salesStatusFilter) return false;
      }
      
      // Customer filter
      if (customerFilter && !sale.customer?.name?.toLowerCase().includes(customerFilter.toLowerCase())) {
        return false;
      }
      
      // Cashier filter
      if (cashierFilter && cashierFilter !== 'all' && !sale.cashier?.toLowerCase().includes(cashierFilter.toLowerCase())) {
        return false;
      }
      
      // Reference number filter
      if (referenceNumberFilter && !String(sale.orderNumber || '').includes(referenceNumberFilter)) {
        return false;
      }
      
      return true;
  });

  const resetFilters = () => {
    setSearchTerm('');
    setDateRange(undefined);
    setTerminalId('all');
    setPaymentTypeFilter('all');
    setSalesStatusFilter('all');
    setCustomerFilter('');
    setCashierFilter('all');
    setSalesGroupFilter('all');
    setReferenceNumberFilter('');
    setTransactionFromFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || dateRange || terminalId !== 'all' || 
    paymentTypeFilter !== 'all' || salesStatusFilter !== 'all' || customerFilter || (cashierFilter && cashierFilter !== 'all') ||
    salesGroupFilter !== 'all' || referenceNumberFilter || transactionFromFilter !== 'all';

  // Calculate summary totals from all sales (not just filtered for display)
  const summaryTotals = sales.reduce((acc, sale) => {
    return {
      discounts: acc.discounts + Number(sale.discount || 0),
      revenue: acc.revenue + Number(sale.total || 0),
      amountPaid: acc.amountPaid + Number(sale.amountPaid || sale.total || 0),
      customerBalance: acc.customerBalance + Number(sale.balance || 0),
      cost: acc.cost + Number(sale.cost || 0),
      grossProfit: acc.grossProfit + Number(sale.profit || 0),
      vatableSales: acc.vatableSales + Number(sale.vatableSales || 0),
      vatAmount: acc.vatAmount + Number(sale.taxAmount || 0),
      nonVatSales: acc.nonVatSales + Number(sale.nonVatSales || 0),
      accountPayments: acc.accountPayments + (sale.paymentMethod === 'Account' ? Number(sale.total || 0) : 0),
    };
  }, {
    discounts: 0,
    revenue: 0,
    amountPaid: 0,
    customerBalance: 0,
    cost: 0,
    grossProfit: 0,
    vatableSales: 0,
    vatAmount: 0,
    nonVatSales: 0,
    accountPayments: 0,
  });

  // Helper to fetch all data for export
  const fetchAllSalesForExport = async () => {
    const params = new URLSearchParams();
    if (dateRange?.from) params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
    if (dateRange?.to) params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
    if (terminalId && terminalId !== 'all') params.append('terminalId', terminalId);
    
    // Fetch ALL data (high limit) to ensure complete export
    params.append('limit', '1000000');
    
    try {
        const response = await fetch(getApiUrl(`/sales/transactions?${params.toString()}`));
        const result = await response.json();
        
        if (result.success && Array.isArray(result.data)) {
            let data = result.data;
            
            // Apply client-side filters to the full dataset
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                data = data.filter((sale: any) => 
                    String(sale.id || sale.posTransactionId).toLowerCase().includes(term) ||
                    sale.customer?.name?.toLowerCase().includes(term)
                );
            }
            
            if (paymentTypeFilter !== 'all') {
                data = data.filter((sale: any) => sale.paymentMethod === paymentTypeFilter);
            }
            
            if (salesStatusFilter !== 'all') {
                data = data.filter((sale: any) => {
                     const status = sale.status || (sale.paymentStatus === 'completed' ? 'Paid' : 'Pending');
                     return status === salesStatusFilter;
                });
            }
            
            if (customerFilter) {
                data = data.filter((sale: any) => sale.customer?.name?.toLowerCase().includes(customerFilter.toLowerCase()));
            }
            
            if (cashierFilter && cashierFilter !== 'all') {
                data = data.filter((sale: any) => sale.cashier?.toLowerCase().includes(cashierFilter.toLowerCase()));
            }
            
            if (referenceNumberFilter) {
                data = data.filter((sale: any) => String(sale.orderNumber || '').includes(referenceNumberFilter));
            }

            return data;
        }
        return [];
    } catch (error) {
        console.error("Export fetch error:", error);
        return [];
    }
  };

  // Export to CSV function
  const exportToCSV = async () => {
    const data = await fetchAllSalesForExport();
    
    // Get user from local storage
    let printedBy = 'admin';
    try {
        const userSession = localStorage.getItem('mock-user-session');
        if (userSession) {
            const user = JSON.parse(userSession);
            printedBy = user.display_name || user.email || 'admin';
        }
    } catch (e) {
        console.error('Error reading user session', e);
    }

    // Fetch Business Name
    let businessName = 'BUSINESS NAME';
    try {
        const settingsRes = await fetch(getApiUrl('/pos-settings'));
        const settings = await settingsRes.json();
        if (settings.success && settings.data?.businessName) {
            businessName = settings.data.businessName;
        }
    } catch (e) {
        console.error('Error fetching settings', e);
    }

    const startDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : 'All Time';
    const endDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : 'All Time';
    const period = dateRange?.from ? `${startDate} to ${endDate}` : 'All Time';
    const printDate = format(new Date(), 'yyyy-MM-dd');

    // Calculate summary for the report
    const summary = data.reduce((acc: any, sale: any) => {
        return {
            salesAmount: acc.salesAmount + Number(sale.total || 0),
            discount: acc.discount + Number(sale.discount || 0),
            amountPaid: acc.amountPaid + Number(sale.amountPaid || sale.total || 0),
            balance: acc.balance + Number(sale.balance || 0),
            cost: acc.cost + Number(sale.cost || 0),
            profit: acc.profit + Number(sale.profit || 0),
        };
    }, { salesAmount: 0, discount: 0, amountPaid: 0, balance: 0, cost: 0, profit: 0 });
    
    // Metadata rows
    const metadata = [
        [businessName],
        ['Printed by:', printedBy],
        ['Print Out Date:', printDate],
        ['Period:', period],
        [] // Empty row
    ];

    // 12-column layout matching PDF
    const headers = [
      'SO No.', 'Receipt No.', 'Date', 'Terminal', 'Cashier', 'Customer', 
      'Discount', 'Sales Amount', 'Amount Paid', 'Balance', 'Cost', 'Profit'
    ];
    
    const formatNumber = (num: any) => {
        return Number(num || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const rows = data.map((sale: any) => [
      sale.orderNumber || '',
      sale.receiptNo || sale.orderNumber || '',
      sale.date ? format(new Date(sale.date), 'MMMM dd, yyyy hh:mm a') : '', 
      sale.terminal || '',
      sale.cashier || '',
      sale.customer?.name || 'Walk-in Customer', 
      formatNumber(sale.discount),
      formatNumber(sale.total),
      formatNumber(sale.amountPaid || sale.total),
      formatNumber(sale.balance),
      formatNumber(sale.cost),
      formatNumber(sale.profit)
    ]);
    
    // Grand Total Row
    const totalRow = [
        'Grand Total', '', '', '', '', '',
        formatNumber(summary.discount),
        formatNumber(summary.salesAmount),
        formatNumber(summary.amountPaid),
        formatNumber(summary.balance),
        formatNumber(summary.cost),
        formatNumber(summary.profit)
    ];
    
    // Combine all parts
    // Note for CSV: standard CSV doesn't strictly support formatting, but strings with commas usually need quotes. 
    // We already wrap everything in quotes in the join logic below.
    const csvContent = [
        ...metadata.map(row => row.map(cell => `"${cell}"`).join(',')),
        headers.join(','), 
        ...rows.map((row: any[]) => row.map(cell => `"${cell}"`).join(',')),
        totalRow.map(cell => `"${cell}"`).join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sales_transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };


  // Export to PDF function
  const exportToPDF = async () => {
    // Open window immediately to avoid popup blocker
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Generating Report...</title></head><body><h1>Loading Sales Data...</h1></body></html>');
    
    // Get user from local storage
    let printedBy = 'admin';
    try {
        const userSession = localStorage.getItem('mock-user-session');
        if (userSession) {
            const user = JSON.parse(userSession);
            printedBy = user.display_name || user.email || 'admin';
        }
    } catch (e) {
        console.error('Error reading user session', e);
    }
    
    // Fetch Data and Settings in parallel
    let data: any[] = [];
    let businessName = 'BUSINESS NAME';
    
    try {
        const [salesData, settingsRes] = await Promise.all([
            fetchAllSalesForExport(),
            fetch(getApiUrl('/pos-settings')).then(res => res.json()).catch(() => ({ success: false }))
        ]);
        
        data = salesData;
        
        if (settingsRes.success && settingsRes.data?.businessName) {
            businessName = settingsRes.data.businessName;
        }
    } catch (e) {
        console.error("Error loading export data", e);
    }
    
    // Calculate summary for the report
    const reportSummary = data.reduce((acc: any, sale: any) => {
        return {
            salesAmount: acc.salesAmount + Number(sale.total || 0),
            discount: acc.discount + Number(sale.discount || 0),
            amountPaid: acc.amountPaid + Number(sale.amountPaid || sale.total || 0),
            balance: acc.balance + Number(sale.balance || 0),
            cost: acc.cost + Number(sale.cost || 0),
            profit: acc.profit + Number(sale.profit || 0),
        };
    }, { salesAmount: 0, discount: 0, amountPaid: 0, balance: 0, cost: 0, profit: 0 });

    const startDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : 'All Time';
    const endDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : 'All Time';
    const period = dateRange?.from ? `${startDate} to ${endDate}` : 'All Time';
    const printDate = format(new Date(), 'yyyy-MM-dd');

    const formatNumber = (num: any) => {
        return Number(num || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const printContent = `
      <html>
        <head>
          <title>Sales Transaction Report</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 10px; padding: 20px; color: #000; }
            .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
            .business-name { font-size: 14px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; }
            .report-title { font-size: 14px; font-weight: bold; text-align: right; }
            .meta-info { font-size: 10px; line-height: 1.4; }
            .meta-row { display: flex; }
            .meta-label { width: 80px; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { text-align: left; font-weight: bold; padding: 6px; border-bottom: 2px solid #000; font-size: 10px; background-color: #f2f2f2; }
            td { padding: 6px; font-size: 10px; vertical-align: top; color: #333; border-bottom: 1px solid #eee; }
            
            .row-main { font-weight: 500; }
            .row-detail { background-color: #fafafa; color: #555; }
            .detail-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding: 4px 8px; font-size: 9px; }
            .detail-item { display: flex; flex-direction: column; }
            .detail-label { font-size: 8px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
            .detail-value { font-weight: 500; }
            
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            
            .summary-box { margin-top: 30px; border-top: 2px solid #000; padding-top: 10px; width: 40%; margin-left: auto; }
            .summary-row { display: flex; justify-content: space-between; padding: 3px 0; }
            .summary-total { font-weight: bold; font-size: 11px; border-top: 1px solid #ccc; padding-top: 5px; margin-top: 5px; }
            
            /* Print friendly */
            @media print {
                @page { margin: 0.5cm; size: landscape; }
                body { margin: 0; padding: 0; }
                .row-detail { background-color: #f9f9f9 !important; -webkit-print-color-adjust: exact; }
                th { background-color: #f2f2f2 !important; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
                <div class="business-name">${businessName}</div>
                <div class="meta-info">
                    <div class="meta-row"><span class="meta-label">Printed by:</span> <span>${printedBy}</span></div>
                    <div class="meta-row"><span class="meta-label">Print Out Date:</span> <span>${printDate}</span></div>
                    <div class="meta-row"><span class="meta-label">Period:</span> <span>${period}</span></div>
                </div>
            </div>
            <div class="report-title">Sales Transaction Report</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 10%">SO No.</th>
                <th style="width: 15%">Date</th>
                <th style="width: 25%">Customer</th>
                <th style="width: 15%">Payment Type</th>
                <th style="width: 15%">Status</th>
                <th class="text-right" style="width: 20%">Sales Amount</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((sale: any) => `
                <tr class="row-main">
                  <td><strong>${sale.orderNumber || ''}</strong></td>
                  <td>${sale.date ? format(new Date(sale.date), "MMM dd, yyyy HH:mm") : ''}</td>
                  <td>${sale.customer?.name || 'Walk-in Customer'}</td>
                  <td>${sale.paymentMethod || ''}</td>
                  <td>${sale.paymentStatus || sale.status || ''}</td>
                  <td class="text-right"><strong>${formatNumber(sale.total)}</strong></td>
                </tr>
                <tr class="row-detail">
                  <td colspan="6">
                    <div class="detail-grid">
                      <div class="detail-item">
                        <span class="detail-label">Receipt No.</span>
                        <span class="detail-value">${sale.receiptNo || sale.orderNumber || '-'}</span>
                      </div>
                      <div class="detail-item">
                        <span class="detail-label">Terminal / Cashier</span>
                        <span class="detail-value">${sale.terminal || '-'} / ${sale.cashier || '-'}</span>
                      </div>
                      <div class="detail-item">
                         <span class="detail-label">Discount</span>
                         <span class="detail-value">${formatNumber(sale.discount)}</span>
                      </div>
                      <div class="detail-item">
                         <span class="detail-label">Amount Paid</span>
                         <span class="detail-value">${formatNumber(sale.amountPaid || sale.total)}</span>
                      </div>
                      <div class="detail-item">
                         <span class="detail-label">Balance</span>
                         <span class="detail-value">${formatNumber(sale.balance)}</span>
                      </div>
                      <div class="detail-item">
                         <span class="detail-label">Cost</span>
                         <span class="detail-value">${formatNumber(sale.cost)}</span>
                      </div>
                      <div class="detail-item">
                         <span class="detail-label">Profit</span>
                         <span class="detail-value">${formatNumber(sale.profit)}</span>
                      </div>
                      <div class="detail-item">
                         <span class="detail-label">Tax (VAT + Non-VAT)</span>
                         <span class="detail-value">${formatNumber((Number(sale.taxAmount || 0) + Number(sale.nonVatSales || 0)))}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="summary-box">
             <div class="summary-row">
                <span>Total Sales:</span>
                <span>${formatNumber(reportSummary.salesAmount)}</span>
             </div>
             <div class="summary-row">
                <span>Total Discount:</span>
                <span>${formatNumber(reportSummary.discount)}</span>
             </div>
             <div class="summary-row">
                <span>Total Cost:</span>
                <span>${formatNumber(reportSummary.cost)}</span>
             </div>
              <div class="summary-row summary-total">
                <span>Total Profit:</span>
                <span>${formatNumber(reportSummary.profit)}</span>
             </div>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.open(); // Reset document
    printWindow.document.write(printContent);
    printWindow.document.close();
    // small delay to ensure render before print
    setTimeout(() => {
        printWindow.print();
    }, 500);
  };


  // Render pagination items logic
  const renderPaginationItems = () => {
      const items = [];
      const maxVisiblePages = 5;

      if (totalPages <= maxVisiblePages) {
          for (let i = 1; i <= totalPages; i++) {
              items.push(
                  <PaginationItem key={i}>
                      <PaginationLink
                          isActive={currentPage === i}
                          onClick={() => handlePageChange(i)}
                      >
                          {i}
                      </PaginationLink>
                  </PaginationItem>
              );
          }
      } else {
          // Always show first page
          items.push(
              <PaginationItem key={1}>
                  <PaginationLink
                      isActive={currentPage === 1}
                      onClick={() => handlePageChange(1)}
                  >
                      1
                  </PaginationLink>
              </PaginationItem>
          );

          if (currentPage > 3) {
              items.push(
                  <PaginationItem key="ellipsis-start">
                      <PaginationEllipsis />
                  </PaginationItem>
              );
          }

          const start = Math.max(2, currentPage - 1);
          const end = Math.min(totalPages - 1, currentPage + 1);

          for (let i = start; i <= end; i++) {
              items.push(
                  <PaginationItem key={i}>
                      <PaginationLink
                          isActive={currentPage === i}
                          onClick={() => handlePageChange(i)}
                      >
                          {i}
                      </PaginationLink>
                  </PaginationItem>
              );
          }

          if (currentPage < totalPages - 2) {
              items.push(
                  <PaginationItem key="ellipsis-end">
                      <PaginationEllipsis />
                  </PaginationItem>
              );
          }

          // Always show last page
          items.push(
              <PaginationItem key={totalPages}>
                  <PaginationLink
                      isActive={currentPage === totalPages}
                      onClick={() => handlePageChange(totalPages)}
                  >
                      {totalPages}
                  </PaginationLink>
              </PaginationItem>
          );
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
                <CardTitle>Sales Transactions</CardTitle>
                <CardDescription>
                  A list of all POS sales to customers.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground font-medium">Discounts</p>
                <p className="text-lg font-bold">₱{summaryTotals.discounts.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground font-medium">Revenue</p>
                <p className="text-lg font-bold text-primary">₱{summaryTotals.revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground font-medium">Amount Paid</p>
                <p className="text-lg font-bold">₱{summaryTotals.amountPaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground font-medium">Customer Balance</p>
                <p className="text-lg font-bold">₱{summaryTotals.customerBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground font-medium">Cost</p>
                <p className="text-lg font-bold">₱{summaryTotals.cost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground font-medium">Gross Profit</p>
                <p className="text-lg font-bold text-green-600">₱{summaryTotals.grossProfit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground font-medium">Vatable Sales</p>
                <p className="text-lg font-bold">₱{summaryTotals.vatableSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground font-medium">VAT Amount</p>
                <p className="text-lg font-bold">₱{summaryTotals.vatAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground font-medium">Non-Vat Sales</p>
                <p className="text-lg font-bold">₱{summaryTotals.nonVatSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground font-medium">Account Payments</p>
                <p className="text-lg font-bold">₱{summaryTotals.accountPayments.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            {/* Search and Filters Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by ID or customer..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Filter Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      Filters
                      {(paymentTypeFilter !== 'all' || terminalId !== 'all' || dateRange || salesStatusFilter !== 'all' || customerFilter || (cashierFilter && cashierFilter !== 'all') || salesGroupFilter !== 'all' || referenceNumberFilter || transactionFromFilter !== 'all') && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                          {[paymentTypeFilter !== 'all', terminalId !== 'all', !!dateRange, salesStatusFilter !== 'all', !!customerFilter, (cashierFilter && cashierFilter !== 'all'), salesGroupFilter !== 'all', !!referenceNumberFilter, transactionFromFilter !== 'all'].filter(Boolean).length}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onSelect={() => { setTempPaymentType(paymentTypeFilter); setPaymentTypeDialogOpen(true); }}>
                      Payment Type
                      {paymentTypeFilter !== 'all' && <Badge variant="secondary" className="ml-auto text-xs">{paymentTypeFilter}</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempTerminalId(terminalId); setTerminalDialogOpen(true); }}>
                      Terminal
                      {terminalId !== 'all' && <Badge variant="secondary" className="ml-auto text-xs">Set</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempDateRange(dateRange); setDateRangeDialogOpen(true); }}>
                      Date Range
                      {dateRange && <Badge variant="secondary" className="ml-auto text-xs">Set</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempSalesStatus(salesStatusFilter); setSalesStatusDialogOpen(true); }}>
                      Sales Status
                      {salesStatusFilter !== 'all' && <Badge variant="secondary" className="ml-auto text-xs">{salesStatusFilter}</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempCustomer(customerFilter); setCustomerDialogOpen(true); }}>
                      Customer
                      {customerFilter && <Badge variant="secondary" className="ml-auto text-xs">Set</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempCashier(cashierFilter); setCashierDialogOpen(true); }}>
                      Cashier
                      {cashierFilter && <Badge variant="secondary" className="ml-auto text-xs">Set</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempSalesGroup(salesGroupFilter); setSalesGroupDialogOpen(true); }}>
                      Sales Group
                      {salesGroupFilter !== 'all' && <Badge variant="secondary" className="ml-auto text-xs">{salesGroupFilter}</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempReferenceNumber(referenceNumberFilter); setReferenceNumberDialogOpen(true); }}>
                      Reference Number
                      {referenceNumberFilter && <Badge variant="secondary" className="ml-auto text-xs">Set</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempTransactionFrom(transactionFromFilter); setTransactionFromDialogOpen(true); }}>
                      Transaction From
                      {transactionFromFilter !== 'all' && <Badge variant="secondary" className="ml-auto text-xs">{transactionFromFilter}</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onSelect={() => {
                        setPaymentTypeFilter('all');
                        setTerminalId('all');
                        setDateRange(undefined);
                        setSalesStatusFilter('all');
                        setCustomerFilter('');
                        setCashierFilter('all');
                        setSalesGroupFilter('all');
                        setReferenceNumberFilter('');
                        setTransactionFromFilter('all');
                      }}
                      className="text-destructive"
                    >
                      Clear All Filters
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Export Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={exportToCSV}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={exportToPDF}>
                      <FileText className="h-4 w-4 mr-2" />
                      Export as PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {hasActiveFilters && (
                  <Button variant="ghost" onClick={resetFilters} size="sm">
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <div className="border rounded-md overflow-hidden">
              <Table className="text-xs" wrapperClassName="max-h-[500px] overflow-auto">
              <TableHeader className="sticky top-0 z-20 bg-primary">
                <TableRow className="bg-primary hover:bg-primary border-0">
                  <TableHead className="text-primary-foreground font-semibold py-2 px-2 w-8 bg-primary sticky top-0"></TableHead>
                  <TableHead className="text-primary-foreground font-semibold py-2 px-2 bg-primary sticky top-0">SO No.</TableHead>
                  <TableHead className="text-primary-foreground font-semibold py-2 px-2 bg-primary sticky top-0">Receipt No.</TableHead>
                  <TableHead className="text-primary-foreground font-semibold py-2 px-2 bg-primary sticky top-0">Date</TableHead>
                  <TableHead className="text-primary-foreground font-semibold py-2 px-2 bg-primary sticky top-0">Terminal</TableHead>
                  <TableHead className="text-primary-foreground font-semibold py-2 px-2 bg-primary sticky top-0">Cashier</TableHead>
                  <TableHead className="text-primary-foreground font-semibold py-2 px-2 bg-primary sticky top-0">Customer</TableHead>
                  <TableHead className="text-primary-foreground font-semibold py-2 px-2 text-right bg-primary sticky top-0">Sales Amount</TableHead>
                  <TableHead className="text-primary-foreground font-semibold py-2 px-2 bg-primary sticky top-0">Payment Type</TableHead>
                  <TableHead className="text-primary-foreground font-semibold py-2 px-2 bg-primary sticky top-0 pr-4">Payment Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={10} className="h-24 text-center">
                             <div className="flex justify-center items-center">
                                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                Loading transactions...
                            </div>
                        </TableCell>
                    </TableRow>
                ) : filteredSales.length > 0 ? (
                  filteredSales.map((sale, index) => {
                    const displayDate = sale.date || sale.invoiceDate;
                    const isPaid = sale.paymentStatus === 'completed' || sale.status === 'Paid';
                    const rowId = sale.posTransactionId || sale.id;
                    const isExpanded = expandedRows.has(rowId);
                    
                    const formatAmount = (val: any) => Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                    return (
                      <Fragment key={rowId}>
                        {/* Main Row */}
                        <TableRow 
                          key={rowId} 
                          className={`${index % 2 === 0 ? 'bg-background' : 'bg-muted/50'} cursor-pointer hover:bg-accent`}
                          onClick={() => toggleRowExpansion(rowId)}
                        >
                          <TableCell className="py-2 px-2">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-primary" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="py-2 px-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                              {sale.orderNumber || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="py-2 px-2">{sale.receiptNo || sale.orderNumber || '-'}</TableCell>
                          <TableCell className="py-2 px-2">
                            {displayDate ? format(new Date(displayDate), 'MMM dd, yyyy hh:mm a') : 'N/A'}
                          </TableCell>
                          <TableCell className="py-2 px-2">{sale.terminal || '-'}</TableCell>
                          <TableCell className="py-2 px-2">{sale.cashier || '-'}</TableCell>
                          <TableCell className="py-2 px-2">{sale.customer?.name || 'Walk-in Customer'}</TableCell>
                          <TableCell className="py-2 px-2 text-right font-medium">{formatAmount(sale.total)}</TableCell>
                          <TableCell className="py-2 px-2">{sale.paymentMethod || '-'}</TableCell>
                          <TableCell className="py-2 px-2">
                            <Badge variant={isPaid ? 'default' : 'destructive'}>
                              {isPaid ? 'Paid' : sale.status || 'Pending'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expandable Details Row */}
                        {isExpanded && (
                          <TableRow key={`${rowId}-details`} className="bg-muted/30">
                            <TableCell colSpan={10} className="py-3 px-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-10 gap-4 text-xs">
                                <div className="flex flex-col">
                                  <span className="text-muted-foreground font-medium">Discount</span>
                                  <span className="font-semibold">{formatAmount(sale.discount)}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-muted-foreground font-medium">Amount Paid</span>
                                  <span className="font-semibold">{formatAmount(sale.amountPaid || sale.total)}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-muted-foreground font-medium">Balance</span>
                                  <span className="font-semibold">{formatAmount(sale.balance)}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-muted-foreground font-medium">Cost</span>
                                  <span className="font-semibold">{formatAmount(sale.cost)}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-muted-foreground font-medium">Profit</span>
                                  <span className="font-semibold">{formatAmount(sale.profit)}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-muted-foreground font-medium">Vatable Sales</span>
                                  <span className="font-semibold">{formatAmount(sale.vatableSales)}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-muted-foreground font-medium">VAT Amount</span>
                                  <span className="font-semibold">{formatAmount(sale.taxAmount)}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-muted-foreground font-medium">Non-Vat Sales</span>
                                  <span className="font-semibold">{formatAmount(sale.nonVatSales)}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-muted-foreground font-medium">Payment Ref.</span>
                                  <span className="font-semibold">{sale.paymentReference || '-'}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-muted-foreground font-medium">Note</span>
                                  <span className="font-semibold">{sale.notes || '-'}</span>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                ) : (
                    <TableRow>
                        <TableCell colSpan={10} className="h-24 text-center">
                            No transactions found for the selected criteria.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>

            </Table>
            </div>

            {/* Pagination Controls */}
            {!isLoading && sales.length > 0 && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mr-auto sm:mr-0 whitespace-nowrap">
                        <Label htmlFor="rows-per-page" className="text-sm font-normal">Rows per page:</Label>
                        <Select
                            value={limit.toString()}
                            onValueChange={(val) => setLimit(Number(val))}
                        >
                            <SelectTrigger id="rows-per-page" className="h-8 w-[70px]">
                                <SelectValue placeholder={limit.toString()} />
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
                    <Pagination className="justify-center sm:justify-end">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                    aria-disabled={currentPage === 1}
                                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                            {renderPaginationItems()}
                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                    aria-disabled={currentPage === totalPages}
                                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
          </CardContent>
        </Card>
    </div>
      
      {/* Payment Type Filter Dialog */}
      <Dialog open={paymentTypeDialogOpen} onOpenChange={setPaymentTypeDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filter by Payment Type</DialogTitle>
            <DialogDescription>Select the payment type to filter transactions.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="paymentType">Payment Type</Label>
            <Select value={tempPaymentType} onValueChange={setTempPaymentType}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select payment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Types</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="GCash">GCash</SelectItem>
                <SelectItem value="Maya">Maya</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Account">Account</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentTypeDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setPaymentTypeFilter(tempPaymentType); setPaymentTypeDialogOpen(false); }}>Apply Filter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminal Filter Dialog */}
      <Dialog open={terminalDialogOpen} onOpenChange={setTerminalDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filter by Terminal</DialogTitle>
            <DialogDescription>Select the terminal to filter transactions.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="terminal">Terminal</Label>
            <div className="mt-2">
              <TerminalSelector 
                terminalId={tempTerminalId}
                onTerminalChange={setTempTerminalId}
                showAllOption={true}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTerminalDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setTerminalId(tempTerminalId); setTerminalDialogOpen(false); }}>Apply Filter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Date Range Filter Dialog */}
      <Dialog open={dateRangeDialogOpen} onOpenChange={setDateRangeDialogOpen}>
        <DialogContent className="sm:max-w-fit max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filter by Date Range</DialogTitle>
            <DialogDescription>Select a date range to filter transactions.</DialogDescription>
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
                  <>Selected: {format(tempDateRange.from, "LLL dd, y")} - {format(tempDateRange.to, "LLL dd, y")}</>
                ) : (
                  <>Selected: {format(tempDateRange.from, "LLL dd, y")}</>
                )}
              </p>
            )}
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => { setTempDateRange(undefined); }}>Clear Date</Button>
            <Button variant="outline" size="sm" onClick={() => setDateRangeDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { setDateRange(tempDateRange); setDateRangeDialogOpen(false); }}>Apply Filter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sales Status Filter Dialog */}
      <Dialog open={salesStatusDialogOpen} onOpenChange={setSalesStatusDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filter by Sales Status</DialogTitle>
            <DialogDescription>Select the sales status to filter transactions.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="salesStatus">Sales Status</Label>
            <Select value={tempSalesStatus} onValueChange={setTempSalesStatus}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
                <SelectItem value="Returned">Returned</SelectItem>
                <SelectItem value="Void">Void</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSalesStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setSalesStatusFilter(tempSalesStatus); setSalesStatusDialogOpen(false); }}>Apply Filter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Filter Dialog */}
      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filter by Customer</DialogTitle>
            <DialogDescription>Enter customer name to filter transactions.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="customer">Customer Name</Label>
            <Input
              id="customer"
              placeholder="Enter customer name..."
              className="mt-2"
              value={tempCustomer}
              onChange={(e) => setTempCustomer(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomerDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setCustomerFilter(tempCustomer); setCustomerDialogOpen(false); }}>Apply Filter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cashier Filter Dialog */}
      <Dialog open={cashierDialogOpen} onOpenChange={setCashierDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filter by Cashier</DialogTitle>
            <DialogDescription>Enter cashier name to filter transactions.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="cashier">Cashier Name</Label>
            <Select value={tempCashier} onValueChange={setTempCashier}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select cashier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cashiers</SelectItem>
                {users.map((user: any) => (
                  <SelectItem key={user.uid} value={user.displayName || user.username}>
                    {user.displayName || user.username}
                  </SelectItem>
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

      {/* Sales Group Filter Dialog */}
      <Dialog open={salesGroupDialogOpen} onOpenChange={setSalesGroupDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filter by Sales Group</DialogTitle>
            <DialogDescription>Select the sales group to filter transactions.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="salesGroup">Sales Group</Label>
            <Select value={tempSalesGroup} onValueChange={setTempSalesGroup}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select sales group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                <SelectItem value="Retail">Retail</SelectItem>
                <SelectItem value="Wholesale">Wholesale</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
                <SelectItem value="In-Store">In-Store</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSalesGroupDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setSalesGroupFilter(tempSalesGroup); setSalesGroupDialogOpen(false); }}>Apply Filter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reference Number Filter Dialog */}
      <Dialog open={referenceNumberDialogOpen} onOpenChange={setReferenceNumberDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filter by Reference Number</DialogTitle>
            <DialogDescription>Enter reference number to filter transactions.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="referenceNumber">Reference Number</Label>
            <Input
              id="referenceNumber"
              placeholder="Enter reference number..."
              className="mt-2"
              value={tempReferenceNumber}
              onChange={(e) => setTempReferenceNumber(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReferenceNumberDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setReferenceNumberFilter(tempReferenceNumber); setReferenceNumberDialogOpen(false); }}>Apply Filter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction From Filter Dialog */}
      <Dialog open={transactionFromDialogOpen} onOpenChange={setTransactionFromDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filter by Transaction From</DialogTitle>
            <DialogDescription>Select the transaction source to filter.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="transactionFrom">Transaction From</Label>
            <Select value={tempTransactionFrom} onValueChange={setTempTransactionFrom}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="POS">POS</SelectItem>
                <SelectItem value="Online">Online</SelectItem>
                <SelectItem value="Manual">Manual Entry</SelectItem>
                <SelectItem value="Import">Import</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransactionFromDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setTransactionFromFilter(tempTransactionFrom); setTransactionFromDialogOpen(false); }}>Apply Filter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
