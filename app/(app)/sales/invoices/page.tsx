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
import { ArrowLeft, Printer, ChevronRight, X, ChevronDown, ChevronUp, Loader2, SlidersHorizontal, Search, MoreHorizontal, FileText } from 'lucide-react';
import type { Sale } from '@/lib/types';
import { AddSalesInvoiceDialog } from './add-sales-invoice-dialog';
import { Logo } from '@/components/logo';
import { useSalesInvoices } from '@/hooks/use-api';
import { getApiUrl } from '@/lib/api-config';
import { formatQuantity } from '@/lib/utils';
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
  const subtotal = (order.items || []).reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
  const shipping = Number((order as any).shipping || 0);
  const grandTotal = subtotal + shipping;

    // POS Invoice Print - Thermal receipt style (58mm/80mm)
    const handlePrintPOSInvoice = () => {
        const printWindow = window.open('', '_blank', 'width=350,height=600');
        if (!printWindow) return;

        const receiptStyles = `
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
            font-family: 'Courier New', Courier, monospace; 
            font-size: 12px; 
            width: 80mm; 
            padding: 5mm; 
            background: white; 
            color: black;
            }
            .header { text-align: center; margin-bottom: 10px; }
            .business-name { font-weight: bold; font-size: 14px; }
            .address { font-size: 10px; }
            .dashed { border-top: 1px dashed #000; margin: 8px 0; }
            .title { text-align: center; font-weight: bold; font-size: 14px; margin: 10px 0; }
            .info-row { display: flex; justify-content: space-between; font-size: 11px; }
            .items { margin: 10px 0; }
            .item { margin-bottom: 5px; }
            .item-name { font-size: 11px; }
            .item-details { display: flex; justify-content: space-between; font-size: 10px; padding-left: 10px; }
            .totals { margin-top: 10px; }
            .total-row { display: flex; justify-content: space-between; font-size: 11px; }
            .total-row.grand { font-weight: bold; font-size: 14px; margin-top: 5px; padding-top: 5px; border-top: 1px dashed #000; }
            .footer { text-align: center; margin-top: 15px; font-size: 10px; }
            @media print { 
            body { width: 80mm; margin: 0; padding: 3mm; }
            @page { size: 80mm auto; margin: 0; }
            }
        </style>
        `;

        printWindow.document.write(`
        <!DOCTYPE html>
        <html>
            <head>
            <title>POS Invoice - ${order.reference || order.receiptNo || order.id.substring(0,8)}</title>
            ${receiptStyles}
            </head>
            <body>
            <div class="header">
                <div class="business-name">${settings?.businessName || 'StockPilot'}</div>
                ${settings?.address ? `<div class="address">${settings.address}</div>` : ''}
                ${settings?.contactNumber ? `<div class="address">${settings.contactNumber}</div>` : ''}
            </div>

            <div class="dashed"></div>

            <div class="title">${title.toUpperCase()}</div>

            <div class="info-row"><span>Ref #:</span><span>${order.reference || order.receiptNo || order.id.substring(0,8)}</span></div>
            <div class="info-row"><span>Date:</span><span>${displayDate ? format(new Date(displayDate), 'MM/dd/yyyy') : 'N/A'}</span></div>
            <div class="info-row"><span>Customer:</span><span>${order.customer?.name || 'Walk-in'}</span></div>

            <div class="dashed"></div>

            <div class="items">
                ${(order.items || []).map(item => `
                <div class="item">
                    <div class="item-name">
                    ${item.product?.name || (item as any).productName || 'Unknown'}
                    </div>
                    <div class="item-details">
                    <span>\${formatQuantity(item.quantity)} x \${Number(item.price || 0).toFixed(2)}</span>
                    <span>${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</span>
                    </div>
                </div>
                `).join('')}
            </div>

            <div class="dashed"></div>

            <div class="totals">
                <div class="total-row"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
                ${shipping > 0 ? `<div class="total-row"><span>Shipping:</span><span>${shipping.toFixed(2)}</span></div>` : ''}
                <div class="total-row"><span>VAT Included:</span><span>0.00</span></div>
                <div class="total-row grand"><span>TOTAL:</span><span>${grandTotal.toFixed(2)}</span></div>
            </div>

            <div class="dashed"></div>

            <div class="footer">
                <p>Thank you for your order!</p>
                <p style="margin-top: 5px;">Printed: ${format(new Date(), 'MM/dd/yyyy hh:mm a')}</p>
            </div>
            </body>
        </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
        printWindow.print();
        printWindow.close();
        }, 250);
    };

  return (
    <div className="printable-area w-full bg-white text-black flex flex-col h-full overflow-hidden">
        {/* INLINE PRINT STYLES FOR MAXIMUM RELIABILITY */}
        <style dangerouslySetInnerHTML={{ __html: `
            @media print {
                /* 1. Force white background and hide non-portalled content */
                html, body {
                    background-color: white !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }

                body > *:not([data-radix-portal]):not([role="dialog"]) { 
                    display: none !important; 
                }
                
                /* 2. Show portal/dialog and FORCE white background */
                [data-radix-portal],
                [role="dialog"] { 
                    display: block !important; 
                    position: static !important; 
                    visibility: visible !important;
                    width: 100% !important;
                    height: auto !important;
                    overflow: visible !important;
                    transform: none !important;
                    box-shadow: none !important;
                    border: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    background-color: white !important;
                    background: white !important;
                }
                
                /* 3. Ensure the printable-area and its descendants are visible */
                .printable-area, 
                .printable-area * { 
                    visibility: visible !important; 
                }
                
                /* 4. Force printable area layout */
                .printable-area { 
                    display: block !important;
                    position: absolute !important; 
                    top: 0 !important; 
                    left: 0 !important; 
                    width: 100% !important; 
                    height: auto !important;
                    background: white !important;
                    padding: 1cm !important;
                    margin: 0 !important;
                    overflow: visible !important;
                }
                
                /* 5. Hide UI buttons, overlays, and focus guards */
                .non-printable, 
                .non-printable *,
                div.non-printable,
                [data-radix-focus-guard],
                [role="presentation"],
                .DialogOverlay,
                button { 
                    display: none !important; 
                    visibility: hidden !important; 
                    height: 0 !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    border: none !important;
                }
            }
        `}} />
        <div className="flex-1 overflow-y-auto p-12 bg-slate-100/50 non-printable flex justify-center">
            <div className="printable-area space-y-6 p-[20mm] bg-white shadow-xl border w-[210mm] min-h-[297mm] mx-auto print:shadow-none print:border-none print:p-0 print:w-full print:min-h-0">
            <div className="flex justify-between items-start mb-6">
                {/* Logo & Business Name */}
                <div className="flex flex-col items-start gap-1">
                    <div className="h-16 w-16 flex items-center justify-center border-2 border-slate-100 rounded-full overflow-hidden mb-1">
                        {settings?.logoPath ? (
                            <img src={settings.logoPath} alt="Logo" className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full bg-slate-100 flex items-center justify-center">
                                <FileText className="h-8 w-8 text-slate-400" />
                            </div>
                        )}
                    </div>
                    <h1 className="text-sm font-bold uppercase tracking-tight">{settings?.businessName || 'STOCKPILOT'}</h1>
                    <p className="text-[9px] leading-tight text-slate-500 max-w-[150px]">{settings?.address}</p>
                </div>

                <div className="text-right">
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-800 mb-4">{title.toUpperCase()}</h2>
                    <table className="text-[10px] ml-auto border-collapse">
                        <tbody>
                            <tr>
                                <td className="px-2 py-1 bg-slate-50 border border-slate-200 font-bold text-left w-24">Invoice Number</td>
                                <td className="px-2 py-1 border border-slate-200 text-right min-w-[100px]">{order.reference || order.receiptNo || order.id.substring(0,8)}</td>
                            </tr>
                            <tr>
                                <td className="px-2 py-1 bg-slate-50 border border-slate-200 font-bold text-left">Invoice Date</td>
                                <td className="px-2 py-1 border border-slate-200 text-right">
                                    {displayDate ? format(new Date(displayDate), 'MMM dd, yyyy') : 'N/A'}
                                </td>
                            </tr>
                            <tr>
                                <td className="px-2 py-1 bg-slate-50 border border-slate-200 font-bold text-left">Due Date</td>
                                <td className="px-2 py-1 border border-slate-200 text-right">
                                    {order.dueDate ? format(new Date(order.dueDate), 'MMM dd, yyyy') : (displayDate ? format(new Date(displayDate), 'MMM dd, yyyy') : 'N/A')}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PARTIES */}
            <div className="grid grid-cols-2 gap-8 mb-6 text-[11px]">
                <div>
                    <p className="font-bold uppercase text-[9px] text-slate-400 mb-1">Bill To:</p>
                    <p className="font-bold text-sm">{order.customer?.name || 'Walk-in Customer'}</p>
                    <p className="text-slate-500 whitespace-pre-wrap leading-tight mt-1">{order.customer?.address || 'Store'}</p>
                </div>
                <div>
                    <p className="font-bold uppercase text-[9px] text-slate-400 mb-1">Ship To:</p>
                    <p className="font-bold text-sm">{order.customer?.name || 'Walk-in Customer'}</p>
                    <p className="text-slate-500 whitespace-pre-wrap leading-tight mt-1">{order.customer?.address || 'Store'}</p>
                </div>
            </div>

            {/* ITEMS TABLE */}
            <div className="mb-6">
                <table className="w-full text-[11px] border-collapse">
                    <thead>
                        <tr className="border-y-2 border-slate-800">
                            <th className="text-left py-2 uppercase font-bold tracking-wider">Description</th>
                            <th className="text-center py-2 uppercase font-bold tracking-wider w-16">Qty</th>
                            <th className="text-right py-2 uppercase font-bold tracking-wider w-24">Price</th>
                            <th className="text-right py-2 uppercase font-bold tracking-wider w-24">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {(order.items || []).map((item, index) => (
                            <tr key={index}>
                                <td className="py-2.5 font-medium uppercase">
                                    {item.product?.name || (item as any).productName || 'Unknown Product'}
                                </td>
                                <td className="py-2.5 text-center">{formatQuantity(item.quantity)}</td>
                                <td className="py-2.5 text-right">{Number(item.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="py-2.5 text-right font-bold">{(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* TOTALS */}
            <div className="flex justify-end mb-8">
                <div className="w-full max-w-[200px] space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                        <span className="font-bold">SUBTOTAL</span>
                        <span className="font-bold">{subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-bold">SHIPPING</span>
                        <span>{shipping.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-bold">VAT INCLUDED</span>
                        <span>0.00</span>
                    </div>
                    <div className="flex justify-between font-black text-sm border-t-2 border-slate-800 pt-1.5">
                        <span>GRAND TOTAL</span>
                        <span>{grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            {/* SIGNATURES */}
            <div className="grid grid-cols-2 gap-10 mt-12 print:mt-16">
                <div className="text-center">
                    <div className="border-b border-slate-300 w-full mb-1 h-8"></div>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Authorized Signature</p>
                </div>
                <div className="text-center">
                    <div className="border-b border-slate-300 w-full mb-1 h-8"></div>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Customer's Signature</p>
                </div>
            </div>
        </div>
    </div>
        
    {/* ACTIONS / NON-PRINTABLE */}
        <div className="flex justify-center gap-3 non-printable p-4 bg-slate-50 border-t w-full shrink-0 print:hidden">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="h-10 px-6 font-bold text-xs uppercase tracking-tight shadow-sm bg-white">
                <Printer className="mr-2 h-4 w-4" />
                Print
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrintPOSInvoice} className="h-10 px-6 font-bold text-xs uppercase tracking-tight shadow-sm bg-white">
                <Printer className="mr-2 h-4 w-4" />
                Print POS Invoice
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="h-10 px-6 font-bold text-xs uppercase tracking-tight shadow-sm bg-white">
                <Printer className="mr-2 h-4 w-4" />
                Print to template
            </Button>
            <Button variant="outline" size="sm" onClick={onBack} className="h-10 px-6 font-bold text-xs uppercase tracking-tight bg-white">
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
    <Card>
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
                                                                    <TableCell className="text-right py-1 text-xs">{formatQuantity(item.quantity)}</TableCell>
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
        <DialogContent className="sm:max-w-none max-w-full w-full h-screen max-h-screen flex flex-col p-0 gap-0 bg-background border-none rounded-none m-0 shadow-none print:h-auto print:max-h-none print:overflow-visible print:static">
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
