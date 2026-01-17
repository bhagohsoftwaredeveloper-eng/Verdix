'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Sale, Customer } from '@/lib/types';
import { format, isPast } from 'date-fns';
import RecordPaymentDialog from './record-payment-dialog';
import ViewInvoiceDialog from './view-invoice-dialog';
import ViewPaymentDialog from './view-payment-dialog';
import { printPaymentReceipt } from '@/lib/print-payment-receipt';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, TrendingUp, AlertCircle, FileText, Search, MoreHorizontal, Printer, FileDown, Banknote, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from "react-day-picker";

// --- Shared Types & Helpers ---



// --- Outstanding Invoices Component ---
function OutstandingInvoices() {
    // ... [Logic from previous implementation]
    const [searchCustomer, setSearchCustomer] = useState<string>('');
    const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
    const [invoices, setInvoices] = useState<Sale[]>([]);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
    const { toast } = useToast();

    const fetchOutstandingInvoices = async () => {
        try {
            setIsLoadingInvoices(true);
            const params = new URLSearchParams();
            if (searchCustomer) params.append('search', searchCustomer);
            if (dateRange.from) params.append('from', dateRange.from.toISOString());
            if (dateRange.to) params.append('to', dateRange.to.toISOString());

            const response = await fetch(`/api/customers/invoices/outstanding?${params.toString()}`);
            const result = await response.json();
            if (result.success) setInvoices(result.data);
            else throw new Error(result.error);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch outstanding invoices' });
        } finally {
            setIsLoadingInvoices(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(fetchOutstandingInvoices, 500);
        return () => clearTimeout(timer);
    }, [searchCustomer, dateRange]);

    const analytics = useMemo(() => {
        let totalOutstanding = 0;
        let overdueAmount = 0;
        let overdueCount = 0;
        invoices.forEach(inv => {
            const amount = Number(inv.total);
            totalOutstanding += amount;
            const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date();
            if (isPast(dueDate) && inv.status !== 'Paid') {
                overdueAmount += amount;
                overdueCount += 1;
            }
        });
        return { totalOutstanding, overdueAmount, overdueCount, totalCount: invoices.length };
    }, [invoices]);

    function getStatusInfo(sale: Sale) {
        if ((sale.status as string) === 'Paid') return { text: 'Paid', variant: 'default' as const };
        const dueDate = sale.dueDate ? new Date(sale.dueDate) : new Date();
        if (isPast(dueDate) && (sale.status as string) !== 'Paid') return { text: 'Overdue', variant: 'destructive' as const };
        return { text: sale.status , variant: 'secondary' as const };
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{analytics.totalOutstanding.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Across {analytics.totalCount} invoices</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">₱{analytics.overdueAmount.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">{analytics.overdueCount} overdue invoices</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{analytics.totalCount}</div>
                        <p className="text-xs text-muted-foreground">Require payment</p>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Outstanding Invoices</CardTitle>
                    <div className="pt-4 flex flex-col sm:flex-row gap-4">
                        <Input placeholder="Search customer..." value={searchCustomer} onChange={(e) => setSearchCustomer(e.target.value)} className="max-w-sm" />
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-[240px] pl-3 text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                                    {dateRange.from ? (dateRange.to ? `${format(dateRange.from, "PPP")} - ${format(dateRange.to, "PPP")}` : format(dateRange.from, "PPP")) : <span>Pick a date range</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="range" selected={dateRange} onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })} numberOfMonths={2} />
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice ID</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingInvoices ? Array.from({length: 3}).map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                            )) : invoices.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No invoices found.</TableCell></TableRow>
                            ) : invoices.map((invoice) => {
                                const status = getStatusInfo(invoice);
                                return (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-mono">{invoice.id}</TableCell>
                                        <TableCell>{invoice.customer.name}</TableCell>
                                        <TableCell>{format(new Date(invoice.invoiceDate || invoice.date || new Date()), 'PP')}</TableCell>
                                        <TableCell>{invoice.dueDate ? format(new Date(invoice.dueDate), 'PP') : 'N/A'}</TableCell>
                                        <TableCell><Badge variant={status.variant}>{status.text}</Badge></TableCell>
                                        <TableCell className="text-right">₱{Number(invoice.total).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <RecordPaymentDialog sale={invoice}>
                                                    <Button variant="ghost" size="icon" title="Record Payment">
                                                        <Banknote className="h-4 w-4 text-green-600" />
                                                    </Button>
                                                </RecordPaymentDialog>
                                                <ViewInvoiceDialog invoiceId={invoice.id}>
                                                    <Button variant="ghost" size="icon" title="View Details">
                                                        <Eye className="h-4 w-4 text-blue-600" />
                                                    </Button>
                                                </ViewInvoiceDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

// --- Payment History Component ---
function PaymentHistory() {
     const [payments, setPayments] = useState<any[]>([]);
     const [isLoading, setIsLoading] = useState(true);
     const [search, setSearch] = useState('');
     const [date, setDate] = useState<DateRange | undefined>(undefined);
     const [paymentType, setPaymentType] = useState('All');
     const { toast } = useToast();

     const fetchPayments = async () => {
        try {
            setIsLoading(true);
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (date?.from) params.append('from', date.from.toISOString());
            if (date?.to) params.append('to', date.to.toISOString());
            if (paymentType && paymentType !== 'All') params.append('paymentType', paymentType);

            const response = await fetch(`/api/customers/payments?${params.toString()}`);
            const result = await response.json();
            if (result.success) setPayments(result.data);
            else throw new Error(result.error);
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch payment history' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(fetchPayments, 500);
        return () => clearTimeout(timer);
    }, [search, date, paymentType]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex gap-2">
                    <Button variant="outline"><FileDown className="mr-2 h-4 w-4"/> Export</Button>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
            </div>
             <Card>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                        <div className="grid gap-2">
                             <label className="text-xs font-semibold text-muted-foreground uppercase">Date Range</label>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date?.from ? (
                                        date.to ? (
                                        <>
                                            {format(date.from, "LLL dd, y")} -{" "}
                                            {format(date.to, "LLL dd, y")}
                                        </>
                                        ) : (
                                        format(date.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={setDate}
                                    numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase">Payment Type</label>
                            <Select value={paymentType} onValueChange={setPaymentType}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="All" /></SelectTrigger>
                                <SelectContent>
                                    {['All', 'Cash', 'Bank Transfer', 'Check', 'GCash', 'PayMaya', 'Credit Card', 'Debit Card', 'Other'].map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="h-8"></div>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="font-semibold">Reference</TableHead>
                                    <TableHead className="font-semibold">Customer</TableHead>
                                    <TableHead className="font-semibold">Date</TableHead>
                                    <TableHead className="font-semibold">Payment Type</TableHead>
                                    <TableHead className="text-right font-semibold">Amount Paid</TableHead>
                                    <TableHead className="text-right font-semibold">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? Array.from({length: 5}).map((_, i) => <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>) :
                                payments.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No payments found.</TableCell></TableRow> :
                                payments.map((payment) => (
                                    <TableRow key={payment.id} className="hover:bg-muted/50 transition-colors">
                                        <TableCell className="font-mono text-xs">{payment.reference}</TableCell>
                                        <TableCell className="font-medium">{payment.customerName}</TableCell>
                                        <TableCell className="text-muted-foreground">{format(new Date(payment.paymentDate), 'MMM dd, yyyy')}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-normal">
                                                {payment.paymentType}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-green-600">₱{Number(payment.amount).toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    onClick={() => printPaymentReceipt({
                                                        id: payment.id,
                                                        customerName: payment.customerName,
                                                        date: payment.paymentDate,
                                                        amount: Number(payment.amount),
                                                        paymentMethod: payment.paymentType,
                                                        reference: payment.reference,
                                                    })}
                                                    title="Print Receipt"
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                                <ViewPaymentDialog payment={payment} />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

// --- Statement of Account Component ---
function StatementOfAccount() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<string>('');
    const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
    const [soaData, setSoaData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch('/api/customers').then(res => res.json()).then(res => {
            if(res.success) setCustomers(res.data);
        });
    }, []);

    const generateSOA = async () => {
        if (!selectedCustomer || !dateRange.from || !dateRange.to) {
            toast({ variant: 'destructive', title: 'Missing Fields', description: 'Please select a customer and date range.' });
            return;
        }
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                customerId: selectedCustomer,
                from: dateRange.from.toISOString(),
                to: dateRange.to.toISOString(),
            });
            const res = await fetch(`/api/reports/soa?${params.toString()}`);
            const data = await res.json();
            if (data.success) setSoaData(data.data);
            else throw new Error(data.error);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to generate SOA' });
        } finally {
            setIsLoading(false);
        }
    }

    const handlePrint = () => {
        if (!soaData) return;
        
        // Simple print: Open a new window with the SOA content styled for print
        const printContent = document.getElementById('soa-print-section');
        if (!printContent) return;

        const printWindow = window.open('', '', 'height=800,width=800');
        if (!printWindow) return;

        printWindow.document.write('<html><head><title>Statement of Account</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .text-right { text-align: right; }
            .header { text-align: center; margin-bottom: 30px; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .total-row { font-weight: bold; background-color: #f9f9f9; }
        `);
        printWindow.document.write('</style></head><body>');
        printWindow.document.write(printContent.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>Generate Statement of Account</CardTitle></CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="grid gap-2 flex-1">
                            <label className="text-sm font-medium">Customer</label>
                            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                                <SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger>
                                <SelectContent>
                                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">From Date</label>
                             <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-[240px] pl-3 text-left font-normal", !dateRange.from && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dateRange.from ? format(dateRange.from, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateRange.from} onSelect={(d) => setDateRange(prev => ({...prev, from: d}))} initialFocus /></PopoverContent></Popover>
                        </div>
                        <div className="grid gap-2">
                             <label className="text-sm font-medium">To Date</label>
                             <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-[240px] pl-3 text-left font-normal", !dateRange.to && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dateRange.to ? format(dateRange.to, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateRange.to} onSelect={(d) => setDateRange(prev => ({...prev, to: d}))} initialFocus /></PopoverContent></Popover>
                        </div>
                        <Button onClick={generateSOA} disabled={isLoading}>{isLoading ? 'Generating...' : 'Generate'}</Button>
                    </div>
                </CardContent>
            </Card>

            {soaData && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Statement Preview</CardTitle>
                        <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" /> Print SOA</Button>
                    </CardHeader>
                    <CardContent>
                        <div id="soa-print-section" className="border p-8 rounded-md bg-white text-black">
                            <div className="header">
                                <h1 className="text-2xl font-bold">Statement of Account</h1>
                                <p className="text-sm text-gray-500">Stock Pilot Inc.</p>
                            </div>
                            <div className="meta">
                                <div>
                                    <p><strong>Customer:</strong> {customers.find(c => c.id === selectedCustomer)?.name}</p>
                                    <p><strong>Period:</strong> {format(new Date(soaData.period.from), 'PP')} - {format(new Date(soaData.period.to), 'PP')}</p>
                                </div>
                                <div className="text-right">
                                    <p><strong>Date Generated:</strong> {format(new Date(), 'PP')}</p>
                                </div>
                            </div>

                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Description</th>
                                        <th>Ref</th>
                                        <th className="text-right">Debit</th>
                                        <th className="text-right">Credit</th>
                                        <th className="text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-gray-50">
                                        <td>-</td>
                                        <td><strong>Beginning Balance</strong></td>
                                        <td>-</td>
                                        <td className="text-right">-</td>
                                        <td className="text-right">-</td>
                                        <td className="text-right font-bold">₱{Number(soaData.startingBalance).toFixed(2)}</td>
                                    </tr>
                                    {soaData.transactions.map((t: any, i: number) => (
                                        <tr key={i}>
                                            <td>{format(new Date(t.date), 'PP')}</td>
                                            <td>{t.type}</td>
                                            <td>{t.reference || t.id.substr(0,8)}</td>
                                            <td className="text-right">{t.debit > 0 ? `₱${Number(t.debit).toFixed(2)}` : '-'}</td>
                                            <td className="text-right">{t.credit > 0 ? `₱${Number(t.credit).toFixed(2)}` : '-'}</td>
                                            <td className="text-right">₱{Number(t.runningBalance).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    <tr className="total-row">
                                        <td colSpan={5} className="text-right">Ending Balance</td>
                                        <td className="text-right">₱{Number(soaData.endingBalance).toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

// --- Main Page Component ---
export default function CustomerPaymentPage() {
  return (
    <div className="space-y-6">
       <div>
            <h2 className="text-3xl font-bold tracking-tight">Customer Payments</h2>
            <p className="text-muted-foreground">Manage invoices, payments, and statements.</p>
       </div>
       
       <Tabs defaultValue="outstanding" className="space-y-4">
          <TabsList>
             <TabsTrigger value="outstanding">Outstanding Invoices</TabsTrigger>
             <TabsTrigger value="history">Payment History</TabsTrigger>
             <TabsTrigger value="soa">Statement of Account</TabsTrigger>
          </TabsList>

          <TabsContent value="outstanding" className="space-y-4">
             <OutstandingInvoices />
          </TabsContent>

           <TabsContent value="history" className="space-y-4">
             <PaymentHistory />
          </TabsContent>

           <TabsContent value="soa" className="space-y-4">
             <StatementOfAccount />
          </TabsContent>
       </Tabs>
    </div>
  );
}
