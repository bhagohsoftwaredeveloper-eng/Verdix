'use client';

import { useState, Fragment, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { ArrowLeft, Printer, ChevronRight, X, ChevronDown, ChevronUp, Loader2, SlidersHorizontal, Search, MoreHorizontal } from 'lucide-react';
import type { Sale } from '@/lib/types';
import { AddSalesInvoiceDialog } from './add-sales-invoice-dialog';
import { Logo } from '@/components/logo';
import { useSalesInvoices } from '@/hooks/use-api';
import { getApiUrl } from '@/lib/api-config';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";



interface PosSettings {
  businessName: string;
  address?: string;
  contactNumber?: string;
  logoPath?: string;
}

function SalesInvoicePrintView({ order, title, settings, onBack }: { order: Sale; title: string; settings: PosSettings | null; onBack: () => void }) {
  const displayDate = order.invoiceDate || order.date;
  const displayDueDate = order.dueDate || order.date;

  return (
    <div className="printable-area w-full bg-white text-slate-800 flex flex-col min-h-[600px]">
        <div className="flex-1 p-8">
            {/* HEADER */}
            <div className="flex justify-between items-start mb-8">
                <div className="flex flex-col gap-4">
                     {/* LOGO & COMPANY NAME */}
                     <div className="flex items-center gap-3">
                        <div className="h-16 w-16 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                             <Logo className="h-10 w-10 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">{settings?.businessName || 'UNIQCODE SERVICES'}</h1>
                            {settings?.address && <p className="text-sm text-muted-foreground">{settings.address}</p>}
                            {settings?.contactNumber && <p className="text-sm text-muted-foreground">{settings.contactNumber}</p>}
                        </div>
                     </div>
                </div>
                
                <div className="flex flex-col items-end">
                    <h2 className="text-3xl font-bold text-slate-500 uppercase tracking-wide mb-6">{title}</h2>
                    
                    {/* INVOICE META TABLE */}
                    <table className="text-sm border-collapse">
                        <tbody>
                            <tr>
                                <td className="bg-slate-100 p-2 font-semibold w-32 border-b border-white">Invoice Number</td>
                                <td className="bg-slate-50 p-2 border-b border-white">{order.reference || order.receiptNo || order.orderNumber || order.id.substring(0,8)}</td>
                            </tr>
                            <tr>
                                <td className="bg-slate-100 p-2 font-semibold border-b border-white">Invoice Date</td>
                                <td className="bg-slate-50 p-2 border-b border-white">{displayDate ? format(new Date(displayDate), 'MMMM d, yyyy') : 'N/A'}</td>
                            </tr>
                            <tr>
                                <td className="bg-slate-100 p-2 font-semibold border-b border-white">Payment Terms</td>
                                <td className="bg-slate-50 p-2 border-b border-white uppercase">{order.customer?.paymentTerms || 'CASH'}</td>
                            </tr>
                            <tr>
                                <td className="bg-slate-100 p-2 font-semibold">Due Date</td>
                                <td className="bg-slate-50 p-2">{displayDueDate ? format(new Date(displayDueDate), 'MMMM d, yyyy') : 'N/A'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* BILL TO / SHIP TO */}
            <div className="grid grid-cols-2 gap-12 mb-8">
                <div>
                    <h3 className="font-bold mb-2 text-sm">Bill to:</h3>
                    <p className="text-lg font-medium mb-1">{order.customer?.name || 'Unknown Customer'}</p>
                    <p className="text-sm text-muted-foreground">Store</p>
                    <p className="text-sm text-muted-foreground">{order.customer?.address || 'Address not provided'}</p>
                    <p className="text-sm text-muted-foreground">{order.customer?.contactNumber || ''}</p>
                </div>
                <div>
                    <h3 className="font-bold mb-2 text-sm">Ship to:</h3>
                    <p className="text-lg font-medium mb-1">{order.customer?.name || 'Unknown Customer'}</p>
                    <p className="text-sm text-muted-foreground">Store</p>
                     <p className="text-sm text-muted-foreground">{order.customer?.address || 'Address not provided'}</p>
                </div>
            </div>

            {/* ITEMS TABLE */}
            <div className="mb-8">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b-2 border-slate-200">
                            <th className="text-left font-semibold text-slate-500 py-2 uppercase">Description</th>
                            <th className="text-right font-semibold text-slate-500 py-2 uppercase">Quantity</th>
                            <th className="text-right font-semibold text-slate-500 py-2 uppercase">Price</th>
                            <th className="text-right font-semibold text-slate-500 py-2 uppercase">Discount</th>
                            <th className="text-right font-semibold text-slate-500 py-2 uppercase">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(order.items || []).map((item, index) => (
                            <tr key={index} className="border-b border-slate-100">
                                <td className="py-2">{item.product?.name || (item as any).productName || 'Unknown Product'}</td>
                                <td className="py-2 text-right">{item.quantity} pack</td>
                                <td className="py-2 text-right">{Number(item.price || 0).toFixed(2)}</td>
                                <td className="py-2 text-right">0.00</td>
                                <td className="py-2 text-right">{(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* TOTALS */}
            <div className="flex justify-end mb-16">
                <div className="w-64">
                    <div className="flex justify-between py-1 text-sm font-semibold text-slate-600">
                        <span>SUBTOTAL</span>
                        <span>{Number(order.total || 0).toFixed(2)}</span>
                    </div>
                     <div className="flex justify-between py-1 text-sm font-semibold text-slate-600">
                        <span>SHIPPING</span>
                        <span>0.00</span>
                    </div>
                     <div className="flex justify-between py-1 text-sm font-semibold text-slate-600">
                        <span>VAT INCLUDED</span>
                        <span>0.00</span>
                    </div>
                    <div className="flex justify-between py-2 border-t border-slate-300 text-base font-bold text-slate-800 mt-2">
                        <span>GRAND TOTAL</span>
                        <span>{Number(order.total || 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
        
        {/* ACTIONS / NON-PRINTABLE */}
        <div className="flex justify-end gap-2 non-printable sticky bottom-0 right-0 p-4 bg-white border-t w-full mt-auto">
            <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Print {title}
            </Button>
            <Button variant="outline" onClick={onBack}>
                 Close
            </Button>
        </div>
    </div>
  );
}

export default function SalesInvoicesPage() {
  const [invoiceToPrint, setInvoiceToPrint] = useState<Sale | null>(null);
  const [printTitle, setPrintTitle] = useState<string>('Sales Invoice');
  const [settings, setSettings] = useState<PosSettings | null>(null);
  
  const { salesInvoices, loading, error, refetch } = useSalesInvoices();
  
  useEffect(() => {
    fetch(getApiUrl('/pos-settings'))
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSettings(data.data);
        }
      })
      .catch(err => console.error('Failed to fetch settings:', err));
  }, []);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState<string | null>(null);
  const { toast } = useToast();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRange | undefined>(undefined);
  const [salesPersonFilter, setSalesPersonFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('');
  const [transactionSourceFilter, setTransactionSourceFilter] = useState<string>('all');
  const [referenceTypeFilter, setReferenceTypeFilter] = useState<string>('all');
  const [referenceNumberFilter, setReferenceNumberFilter] = useState<string>('');
  const [receiptNumberFilter, setReceiptNumberFilter] = useState<string>('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Dialog States
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [dateRangeDialogOpen, setDateRangeDialogOpen] = useState(false);
  const [salesPersonDialogOpen, setSalesPersonDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [transactionSourceDialogOpen, setTransactionSourceDialogOpen] = useState(false);
  const [referenceTypeDialogOpen, setReferenceTypeDialogOpen] = useState(false);
  const [referenceNumberDialogOpen, setReferenceNumberDialogOpen] = useState(false);
  const [receiptNumberDialogOpen, setReceiptNumberDialogOpen] = useState(false);

  // Temporary Filter States (for inside dialogs)
  const [tempStatus, setTempStatus] = useState<string>('all');
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(undefined);
  const [tempSalesPerson, setTempSalesPerson] = useState<string>('all');
  const [tempCustomer, setTempCustomer] = useState<string>('');
  const [tempTransactionSource, setTempTransactionSource] = useState<string>('all');
  const [tempReferenceType, setTempReferenceType] = useState<string>('all');
  const [tempReferenceNumber, setTempReferenceNumber] = useState<string>('');
  const [tempReceiptNumber, setTempReceiptNumber] = useState<string>('');

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filtering or searching
  }, [statusFilter, dateRangeFilter, salesPersonFilter, customerFilter, transactionSourceFilter, referenceTypeFilter, referenceNumberFilter, receiptNumberFilter, searchQuery]);


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

  const handlePrint = (sale: Sale, title: string = 'Sales Invoice') => {
    setInvoiceToPrint(sale);
    setPrintTitle(title);
  };

  const handleVoid = async (saleId: string) => {
    try {
      setIsVoiding(true);
      const response = await fetch(getApiUrl(`/sales/invoices/${saleId}/void`), {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: "Invoice voided successfully",
        });
        refetch();
      } else {
        toast({
          variant: "destructive",
          title: "Failed to void invoice",
          description: result.error || "An error occurred",
        });
      }
    } catch (error) {
      console.error("Error voiding invoice:", error);
      toast({
        variant: "destructive",
        title: "An error occurred while voiding the invoice",
      });
    } finally {
      setIsVoiding(false);
      setVoidDialogOpen(null); // Close dialog
    }
  };

  const getStatusInfo = (sale: Sale): { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    if (sale.status === 'Voided') {
      return { text: 'Voided', variant: 'destructive' };
    }
    switch (sale.status) {
      case 'Paid':
        return { text: 'Paid', variant: 'default' };
      case 'Failed':
      case 'Returned':
        return { text: sale.status, variant: 'destructive' };
      case 'Shipped':
      case 'Delivered':
        return { text: sale.status, variant: 'outline' };
      case 'Pending':
      default:
        const dueDate = sale.dueDate ? new Date(sale.dueDate) : new Date();
        const diffTime = new Date().getTime() - dueDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        if (new Date() > dueDate) {
            return { text: `Over Due ${diffDays} days`, variant: 'destructive' };
        }
        return { text: 'Due', variant: 'secondary' };
    }
  };

  const isOverDue = (sale: Sale) => {
    if (sale.status === 'Paid' || sale.status === 'Voided' || sale.status === 'Returned') return false;
    const dueDate = sale.dueDate ? new Date(sale.dueDate) : new Date();
    return new Date() > dueDate;
  };

  const formatAmount = (val: any) => Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const resetFilters = () => {
    setStatusFilter('all');
    setDateRangeFilter(undefined);
    setSalesPersonFilter('all');
    setCustomerFilter('');
    setTransactionSourceFilter('all');
    setReferenceTypeFilter('all');
    setReferenceNumberFilter('');
    setReceiptNumberFilter('');
    setSearchQuery('');
  };

  const hasActiveFilters = statusFilter !== 'all' || dateRangeFilter || salesPersonFilter !== 'all' || customerFilter || transactionSourceFilter !== 'all' || referenceTypeFilter !== 'all' || referenceNumberFilter || receiptNumberFilter;

  // Derive unique sales persons for filter dropdown
  const uniqueSalesPersons = Array.from(new Set(salesInvoices.map((s: Sale) => s.salesPerson).filter(Boolean)));

  // Filter Logic
  const relevantSales = salesInvoices.filter((s: Sale) => {
     // Base filter: only show relevant statuses for this page
     if (!['Paid', 'Shipped', 'Delivered', 'Pending', 'Voided'].includes(s.status)) return false;

     // Global Search Filter
     if (searchQuery) {
         const query = searchQuery.toLowerCase();
         const matches = 
            s.customer?.name?.toLowerCase().includes(query) ||
            s.salesPerson?.toLowerCase().includes(query) ||
            s.reference?.toString().toLowerCase().includes(query) ||
            (s as any).receiptNo?.toString().toLowerCase().includes(query) ||
            s.orderNumber?.toString().includes(query) ||
            s.id.toLowerCase().includes(query);
        
        if (!matches) return false;
     }

     // 1. Status Filter
     if (statusFilter !== 'all' && s.status !== statusFilter) return false;

     // 2. Date Range Filter
     if (dateRangeFilter?.from) {
        const saleDate = new Date(s.invoiceDate || s.date || '');
        if (saleDate < dateRangeFilter.from) return false;
        if (dateRangeFilter.to && saleDate > dateRangeFilter.to) return false;
     }

     // 3. Sales Person Filter
     if (salesPersonFilter !== 'all' && s.salesPerson !== salesPersonFilter) {
         if(!s.salesPerson && salesPersonFilter === 'unassigned') {
         } else {
            return false;
         }
     }
     if (salesPersonFilter === 'unassigned' && s.salesPerson) return false;

     // 4. Customer Filter
     if (customerFilter && !s.customer?.name?.toLowerCase().includes(customerFilter.toLowerCase())) return false;

     // 5. Transaction Source Filter
     if (transactionSourceFilter !== 'all' && s.transactionSource !== transactionSourceFilter) return false;

     // 6. Reference Type Filter
     if (referenceTypeFilter !== 'all') {
     }

     // 7. Reference # Filter
     const displayRef = s.reference || s.id.substring(0,8);
     if (referenceNumberFilter && !displayRef.toLowerCase().includes(referenceNumberFilter.toLowerCase())) return false;

     // 8. Receipt # Filter
     const recNo = (s as any).receiptNo?.toString() || s.orderNumber?.toString() || '';
     if (receiptNumberFilter && !recNo.toLowerCase().includes(receiptNumberFilter.toLowerCase())) return false;

     return true;
  });

  // Calculate Summary Totals
  const summaryTotals = relevantSales.reduce((acc, sale) => {
      const amountPaid = sale.status === 'Paid' ? sale.total : 0;
      const balance = sale.total - amountPaid;
      const isOverdue = isOverDue(sale);
      
      return {
          total: acc.total + sale.total,
          amountPaid: acc.amountPaid + amountPaid,
          balance: acc.balance + balance,
          due: acc.due + (isOverdue ? 0 : balance),
          overDue: acc.overDue + (isOverdue ? balance : 0),
      };
  }, { total: 0, amountPaid: 0, balance: 0, due: 0, overDue: 0 });

  // Pagination Logic
  const totalItems = relevantSales.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentSales = relevantSales.slice(startIndex, startIndex + itemsPerPage);

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) {
            items.push(
                <PaginationItem key={i}>
                    <PaginationLink 
                        isActive={currentPage === i}
                        onClick={() => setCurrentPage(i)}
                    >
                        {i}
                    </PaginationLink>
                </PaginationItem>
            );
        }
    } else {
        items.push(
            <PaginationItem key={1}>
                <PaginationLink isActive={currentPage === 1} onClick={() => setCurrentPage(1)}>1</PaginationLink>
            </PaginationItem>
        );

        if (currentPage > 3) {
            items.push(<PaginationItem key="start-ellipsis"><PaginationEllipsis /></PaginationItem>);
        }

        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        for (let i = start; i <= end; i++) {
            items.push(
                <PaginationItem key={i}>
                    <PaginationLink isActive={currentPage === i} onClick={() => setCurrentPage(i)}>{i}</PaginationLink>
                </PaginationItem>
            );
        }

        if (currentPage < totalPages - 2) {
            items.push(<PaginationItem key="end-ellipsis"><PaginationEllipsis /></PaginationItem>);
        }

        items.push(
            <PaginationItem key={totalPages}>
                <PaginationLink isActive={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>{totalPages}</PaginationLink>
            </PaginationItem>
        );
    }
    return items;
  };

  return (
    <Card className="printable-area">
      <CardHeader className="non-printable">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sales Invoice / Delivery</CardTitle>
            <CardDescription>
              View and print invoices or delivery receipts for your sales.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
               {/* SEARCH INPUT */}
               <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search invoices..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
               </div>

               {/* FILTERS DROPDOWN */}
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      Filters
                      {hasActiveFilters && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                          !
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onSelect={() => { setTempStatus(statusFilter); setStatusDialogOpen(true); }}>
                      Status
                      {statusFilter !== 'all' && <Badge variant="secondary" className="ml-auto text-xs">{statusFilter}</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempDateRange(dateRangeFilter); setDateRangeDialogOpen(true); }}>
                      Date Range
                      {dateRangeFilter && <Badge variant="secondary" className="ml-auto text-xs">Set</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempSalesPerson(salesPersonFilter); setSalesPersonDialogOpen(true); }}>
                      Sales Person
                      {salesPersonFilter !== 'all' && <Badge variant="secondary" className="ml-auto text-xs">Set</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempCustomer(customerFilter); setCustomerDialogOpen(true); }}>
                      Customer
                      {customerFilter && <Badge variant="secondary" className="ml-auto text-xs">Set</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempTransactionSource(transactionSourceFilter); setTransactionSourceDialogOpen(true); }}>
                       Transaction From
                       {transactionSourceFilter !== 'all' && <Badge variant="secondary" className="ml-auto text-xs">{transactionSourceFilter}</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempReferenceType(referenceTypeFilter); setReferenceTypeDialogOpen(true); }}>
                       Reference Type
                       {referenceTypeFilter !== 'all' && <Badge variant="secondary" className="ml-auto text-xs">Set</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempReferenceNumber(referenceNumberFilter); setReferenceNumberDialogOpen(true); }}>
                       Reference #
                       {referenceNumberFilter && <Badge variant="secondary" className="ml-auto text-xs">Set</Badge>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => { setTempReceiptNumber(receiptNumberFilter); setReceiptNumberDialogOpen(true); }}>
                       Receipt #
                       {receiptNumberFilter && <Badge variant="secondary" className="ml-auto text-xs">Set</Badge>}
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={resetFilters} className="text-destructive">
                      Clear All Filters
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <AddSalesInvoiceDialog onSuccess={refetch} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground font-medium">Total</p>
                <p className="text-lg font-bold">₱{formatAmount(summaryTotals.total)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground font-medium">Amount Paid</p>
                <p className="text-lg font-bold text-primary">₱{formatAmount(summaryTotals.amountPaid)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground font-medium">Balance</p>
                <p className="text-lg font-bold">₱{formatAmount(summaryTotals.balance)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground font-medium">Due</p>
                <p className="text-lg font-bold">₱{formatAmount(summaryTotals.due)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-xs text-muted-foreground font-medium">OverDue</p>
                <p className="text-lg font-bold text-destructive">₱{formatAmount(summaryTotals.overDue)}</p>
              </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
             <div className="flex justify-center items-center">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading sales invoices...</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-sm text-destructive py-8 text-center">
            Error loading sales invoices: {error}
          </div>
        ) : (
          <div className="space-y-4">
                <Table 
                    className="text-xs border-separate border-spacing-0"
                    wrapperClassName="h-[550px] border rounded-md relative"
                >
                    <TableHeader className="bg-primary">
                    <TableRow className="bg-primary hover:bg-primary">
                        <TableHead className="sticky top-0 z-20 text-primary-foreground font-semibold py-2 px-2 w-8 bg-primary border-b"></TableHead>
                        <TableHead className="sticky top-0 z-20 text-primary-foreground font-semibold py-2 px-2 bg-primary border-b">User</TableHead>
                        <TableHead className="sticky top-0 z-20 text-primary-foreground font-semibold py-2 px-2 bg-primary font-medium border-b">Customer</TableHead>
                        <TableHead className="sticky top-0 z-20 text-primary-foreground font-semibold py-2 px-2 bg-primary border-b">Reference</TableHead>
                        <TableHead className="sticky top-0 z-20 text-primary-foreground font-semibold py-2 px-2 bg-primary font-medium border-b">Receipt No</TableHead>
                        <TableHead className="sticky top-0 z-20 text-primary-foreground font-semibold py-2 px-2 bg-primary border-b">Trans Ref</TableHead>
                        <TableHead className="sticky top-0 z-20 text-primary-foreground font-semibold py-2 px-2 bg-primary border-b">Type</TableHead>
                        <TableHead className="sticky top-0 z-20 text-primary-foreground font-semibold py-2 px-2 bg-primary border-b">Invoice Date</TableHead>
                        <TableHead className="sticky top-0 z-20 text-primary-foreground font-semibold py-2 px-2 bg-primary border-b">Due Date</TableHead>
                        <TableHead className="sticky top-0 z-20 text-primary-foreground font-semibold py-2 px-2 bg-primary text-right border-b">Total</TableHead>
                        <TableHead className="sticky top-0 z-20 text-primary-foreground font-semibold py-2 px-2 bg-primary text-right border-b">Amount Paid</TableHead>
                        <TableHead className="sticky top-0 z-20 text-primary-foreground font-semibold py-2 px-2 bg-primary text-right border-b">Balance</TableHead>
                        <TableHead className="sticky top-0 z-20 text-primary-foreground font-semibold py-2 px-2 bg-primary border-b">Status</TableHead>
                        <TableHead className="sticky top-0 z-20 text-primary-foreground font-semibold py-2 px-2 text-right bg-primary border-b">Action</TableHead>
                    </TableRow>
                    </TableHeader>

                    <TableBody>
                    {currentSales.length > 0 ? (
                        currentSales.map((sale: Sale, index) => {
                            const displayDate = sale.invoiceDate || sale.date;
                            const statusInfo = getStatusInfo(sale);
                            const amountPaid = sale.status === 'Paid' ? sale.total : 0;
                            const balance = sale.total - amountPaid;
                            const isExpanded = expandedRows.has(sale.id);
                            const formattedRef = (() => {
                                if (!sale.reference) return sale.id.substring(0,8);
                                const refNum = sale.reference.toString().replace(/\D/g, '').replace(/^0+/, '') || '0';
                                if (sale.orderNumber) {
                                    return `${refNum}|SO#${sale.orderNumber}`;
                                }
                                return refNum;
                            })();

                            return (
                                <Fragment key={sale.id}>
                                    <TableRow 
                                        className={`${index % 2 === 0 ? 'bg-background' : 'bg-muted/50'} cursor-pointer hover:bg-accent`}
                                        onClick={() => toggleRowExpansion(sale.id)}
                                    >
                                        <TableCell className="py-2 px-2">
                                            {isExpanded ? (
                                            <ChevronUp className="h-4 w-4 text-primary" />
                                            ) : (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </TableCell>
                                        <TableCell className="py-2 px-2">{sale.salesPerson || 'admin'}</TableCell>
                                        <TableCell className="py-2 px-2 font-medium">{sale.customer?.name || 'Unknown'}</TableCell>
                                        <TableCell className="py-2 px-2">{formattedRef}</TableCell>
                                        <TableCell className="py-2 px-2 text-primary font-medium">{sale.receiptNo || sale.orderNumber || ''}</TableCell>
                                        <TableCell className="py-2 px-2">
                                            <Badge variant="outline" className={sale.transactionSource === 'Backoffice' ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-orange-50 text-orange-700 border-orange-200"}>
                                                {sale.transactionSource || 'POS'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-2 px-2">Sales Invoice</TableCell>
                                        <TableCell className="py-2 px-2">
                                            {displayDate ? format(new Date(displayDate), 'PP') : 'N/A'}
                                        </TableCell>
                                        <TableCell className="py-2 px-2">
                                            {sale.dueDate ? format(new Date(sale.dueDate), 'PP') : 'N/A'}
                                        </TableCell>
                                        <TableCell className="py-2 px-2 text-right font-medium">₱{formatAmount(sale.total)}</TableCell>
                                        <TableCell className="py-2 px-2 text-right">₱{formatAmount(amountPaid)}</TableCell>
                                        <TableCell className="py-2 px-2 text-right">₱{formatAmount(balance)}</TableCell>
                                        <TableCell className="py-2 px-2">
                                            <Badge variant={statusInfo.variant} className="whitespace-nowrap">{statusInfo.text}</Badge>
                                        </TableCell>
                                        <TableCell className="py-2 px-2 text-right">
                                            <div onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handlePrint(sale, 'Sales Invoice')}>
                                                        <Printer className="mr-2 h-4 w-4" /> Print Invoice
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handlePrint(sale, 'Delivery Note')}>
                                                        <Printer className="mr-2 h-4 w-4" /> Delivery Note
                                                    </DropdownMenuItem>
                                                    {sale.status !== 'Voided' && (
                                                    <DropdownMenuItem 
                                                        onClick={() => setVoidDialogOpen(sale.id)} 
                                                        className="text-destructive focus:text-destructive"
                                                    >
                                                        <X className="mr-2 h-4 w-4" /> Void
                                                    </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                                <AlertDialog open={voidDialogOpen === sale.id} onOpenChange={(open) => !open && setVoidDialogOpen(null)}>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will void the invoice and return all items to stock. This action cannot be undone.
                                                        </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleVoid(sale.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                            Void Invoice
                                                        </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>

                                    {/* Expandable Details Row */}
                                    {isExpanded && (
                                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                                            <TableCell colSpan={14} className="py-3 px-4">
                                                <div className="p-4 border rounded bg-background/50">
                                                    <h4 className="font-semibold mb-2 text-sm">Invoice Items ({sale.items.length})</h4>
                                                    <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                        <TableHead className="text-xs">Product</TableHead>
                                                        <TableHead className="text-right text-xs">Quantity</TableHead>
                                                        <TableHead className="text-right text-xs">Price per Item</TableHead>
                                                        <TableHead className="text-right text-xs">Subtotal</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {(sale.items || []).map((item, idxx) => {
                                                            const batchSource: any[] = (item as any).batchSource || [];
                                                            const costAtSale: number | null = (item as any).costAtSale ?? null;
                                                            const hasBatchData = batchSource.length > 0;
                                                            const itemRevenue = Number(item.price || 0) * Number(item.quantity || 0);
                                                            const itemCost = costAtSale != null ? costAtSale * Number(item.quantity || 0) : null;
                                                            const itemProfit = itemCost != null ? itemRevenue - itemCost : null;

                                                            return (
                                                            <Fragment key={item.product?.id || (item as any).productId || idxx}>
                                                                <TableRow>
                                                                    <TableCell className="py-1 text-xs">{item.product?.name || (item as any).productName || 'Unknown Product'}</TableCell>
                                                                    <TableCell className="text-right py-1 text-xs">{item.quantity}</TableCell>
                                                                    <TableCell className="text-right py-1 text-xs">₱{formatAmount(item.price)}</TableCell>
                                                                    <TableCell className="text-right py-1 text-xs">₱{formatAmount(itemRevenue)}</TableCell>
                                                                </TableRow>
                                                                {hasBatchData && (
                                                                    <TableRow className="bg-amber-50/50 hover:bg-amber-50/50">
                                                                        <TableCell colSpan={4} className="py-0 px-3 pb-2">
                                                                            <div className="mt-1 rounded border border-amber-200 overflow-hidden">
                                                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-100/70 border-b border-amber-200">
                                                                                    <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">Batch Cost Breakdown</span>
                                                                                    {itemProfit != null && (
                                                                                        <span className={`ml-auto text-[10px] font-medium ${itemProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                                                                            Gross Profit: ₱{formatAmount(itemProfit)} ({itemRevenue > 0 ? ((itemProfit / itemRevenue) * 100).toFixed(1) : '0.0'}%)
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <table className="w-full text-[10px]">
                                                                                    <thead>
                                                                                        <tr className="bg-amber-50/80">
                                                                                            <th className="text-left px-2 py-1 text-amber-700 font-medium">Source Batch</th>
                                                                                            <th className="text-right px-2 py-1 text-amber-700 font-medium">Qty</th>
                                                                                            <th className="text-right px-2 py-1 text-amber-700 font-medium">Unit Cost</th>
                                                                                            <th className="text-right px-2 py-1 text-amber-700 font-medium">Sell Price</th>
                                                                                            <th className="text-right px-2 py-1 text-amber-700 font-medium">Line Cost</th>
                                                                                            <th className="text-right px-2 py-1 text-amber-700 font-medium">Line Revenue</th>
                                                                                            <th className="text-right px-2 py-1 text-amber-700 font-medium">Profit</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {batchSource.map((split: any, si: number) => {
                                                                                            const splitRevenue = split.qty * Number(item.price || 0);
                                                                                            const splitCost = split.qty * split.unitCost;
                                                                                            const splitProfit = splitRevenue - splitCost;
                                                                                            return (
                                                                                                <tr key={si} className={si % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'}>
                                                                                                    <td className="px-2 py-0.5">
                                                                                                        {split.type === 'fallback'
                                                                                                            ? <span className="italic text-muted-foreground">(untracked — fallback)</span>
                                                                                                            : <span className="font-mono">{split.batchId}</span>
                                                                                                        }
                                                                                                    </td>
                                                                                                    <td className="text-right px-2 py-0.5">{split.qty}</td>
                                                                                                    <td className="text-right px-2 py-0.5 text-blue-700">₱{formatAmount(split.unitCost)}</td>
                                                                                                    <td className="text-right px-2 py-0.5">₱{formatAmount(Number(item.price || 0))}</td>
                                                                                                    <td className="text-right px-2 py-0.5">₱{formatAmount(splitCost)}</td>
                                                                                                    <td className="text-right px-2 py-0.5">₱{formatAmount(splitRevenue)}</td>
                                                                                                    <td className={`text-right px-2 py-0.5 font-medium ${splitProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                                                                                        ₱{formatAmount(splitProfit)}
                                                                                                    </td>
                                                                                                </tr>
                                                                                            );
                                                                                        })}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )}
                                                            </Fragment>
                                                            );
                                                        })}
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
                        <TableRow>
                        <TableCell colSpan={14} className="h-24 text-center">
                            No invoices found matching the filters.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            
             <div className="flex items-center justify-between px-2 py-4 border-t">
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium whitespace-nowrap">Rows per page</p>
                    <Select
                        value={`${itemsPerPage}`}
                        onValueChange={(value) => {
                            setItemsPerPage(Number(value));
                            setCurrentPage(1);
                        }}
                    >
                    <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue placeholder={itemsPerPage} />
                    </SelectTrigger>
                    <SelectContent side="top">
                        {[10, 20, 30, 40, 50].map((pageSize) => (
                        <SelectItem key={pageSize} value={`${pageSize}`}>
                            {pageSize}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                     <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                        Page {currentPage} of {totalPages}
                    </div>
                </div>
                
                 <Pagination>
                    <PaginationContent>
                         <PaginationItem>
                            <PaginationPrevious 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                        </PaginationItem>
                        
                        {renderPaginationItems()}

                        <PaginationItem>
                             <PaginationNext 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                             />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
             </div>
          </div>
        )}
      </CardContent>

      {/* FILTER DIALOGS */}
      
      {/* 1. Status Filter */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filter by Status</DialogTitle>
            <DialogDescription>Select the status to filter by.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Status</Label>
            <Select value={tempStatus} onValueChange={setTempStatus}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Voided">Voided</SelectItem>
                <SelectItem value="Shipped">Shipped</SelectItem>
                <SelectItem value="Delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setStatusFilter(tempStatus); setStatusDialogOpen(false); }}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 2. Date Range Filter */}
      <Dialog open={dateRangeDialogOpen} onOpenChange={setDateRangeDialogOpen}>
        <DialogContent className="sm:max-w-fit">
          <DialogHeader>
            <DialogTitle>Filter by Date Range</DialogTitle>
          </DialogHeader>
          <div className="py-4">
             <Calendar
                initialFocus
                mode="range"
                defaultMonth={tempDateRange?.from}
                selected={tempDateRange}
                onSelect={setTempDateRange}
                numberOfMonths={1}
                className="rounded-md border mx-auto"
              />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTempDateRange(undefined); }}>Clear</Button>
            <Button onClick={() => { setDateRangeFilter(tempDateRange); setDateRangeDialogOpen(false); }}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Sales Person Filter */}
      <Dialog open={salesPersonDialogOpen} onOpenChange={setSalesPersonDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filter by Sales Person</DialogTitle>
          </DialogHeader>
           <div className="py-4">
            <Label>Sales Person</Label>
            <Select value={tempSalesPerson} onValueChange={setTempSalesPerson}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select person" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unassigned">Unassigned / Admin</SelectItem>
                {uniqueSalesPersons.map((sp: any) => (
                    <SelectItem key={sp} value={sp}>{sp}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSalesPersonDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setSalesPersonFilter(tempSalesPerson); setSalesPersonDialogOpen(false); }}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Customer Filter */}
      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filter by Customer</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Customer Name</Label>
            <Input 
                value={tempCustomer} 
                onChange={(e) => setTempCustomer(e.target.value)} 
                placeholder="Enter customer name..." 
                className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomerDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setCustomerFilter(tempCustomer); setCustomerDialogOpen(false); }}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

       {/* 5. Transaction Source Filter */}
       <Dialog open={transactionSourceDialogOpen} onOpenChange={setTransactionSourceDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filter by Transaction From</DialogTitle>
          </DialogHeader>
          <div className="py-4">
             <Label>Source</Label>
            <Select value={tempTransactionSource} onValueChange={setTempTransactionSource}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="POS">POS</SelectItem>
                <SelectItem value="Backoffice">Backoffice</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransactionSourceDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setTransactionSourceFilter(tempTransactionSource); setTransactionSourceDialogOpen(false); }}>Apply</Button>
          </DialogFooter>
        </DialogContent>
       </Dialog>

       {/* 6. Reference Type Filter */}
       <Dialog open={referenceTypeDialogOpen} onOpenChange={setReferenceTypeDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filter by Reference Type</DialogTitle>
          </DialogHeader>
           <div className="py-4">
             <Label>Type</Label>
            <Select value={tempReferenceType} onValueChange={setTempReferenceType}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Sales Invoice">Sales Invoice</SelectItem>
                <SelectItem value="Delivery Receipt">Delivery Receipt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReferenceTypeDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setReferenceTypeFilter(tempReferenceType); setReferenceTypeDialogOpen(false); }}>Apply</Button>
          </DialogFooter>
        </DialogContent>
       </Dialog>

       {/* 7. Reference # Filter */}
       <Dialog open={referenceNumberDialogOpen} onOpenChange={setReferenceNumberDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filter by Reference #</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Reference Number</Label>
            <Input 
                value={tempReferenceNumber} 
                onChange={(e) => setTempReferenceNumber(e.target.value)} 
                placeholder="Enter ref #" 
                className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReferenceNumberDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setReferenceNumberFilter(tempReferenceNumber); setReferenceNumberDialogOpen(false); }}>Apply</Button>
          </DialogFooter>
        </DialogContent>
       </Dialog>

       {/* 8. Receipt # Filter */}
       <Dialog open={receiptNumberDialogOpen} onOpenChange={setReceiptNumberDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Filter by Receipt #</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Receipt Number</Label>
            <Input 
                value={tempReceiptNumber} 
                onChange={(e) => setTempReceiptNumber(e.target.value)} 
                placeholder="Enter receipt #" 
                className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptNumberDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setReceiptNumberFilter(tempReceiptNumber); setReceiptNumberDialogOpen(false); }}>Apply</Button>
          </DialogFooter>
        </DialogContent>
       </Dialog>

      {/* PRINT INVOICE DIALOG */}
      <Dialog open={!!invoiceToPrint} onOpenChange={(open) => !open && setInvoiceToPrint(null)}>
        <DialogContent className="max-w-5xl w-full p-0 overflow-y-auto max-h-[90vh]">
          <DialogTitle className="sr-only">Print Invoice</DialogTitle>
          {invoiceToPrint && (
             <SalesInvoicePrintView 
                order={invoiceToPrint} 
                title={printTitle} 
                settings={settings} 
                onBack={() => setInvoiceToPrint(null)} 
             />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
