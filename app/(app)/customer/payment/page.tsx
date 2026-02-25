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
import { CalendarIcon, TrendingUp, AlertCircle, FileText, Search, MoreHorizontal, Printer, FileDown, Banknote, Eye, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';
import { DateRange } from "react-day-picker";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

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

            const response = await fetch(getApiUrl(`/customers/invoices/outstanding?${params.toString()}`));
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

            const response = await fetch(getApiUrl(`/customers/payments?${params.toString()}`));
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
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: undefined, to: undefined }); // Changed plain object to DateRange | undefined
    const [soaData, setSoaData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [openCustomer, setOpenCustomer] = useState(false); // State for Combobox
    const { toast } = useToast();

    // Import components locally if possible, but since this is inside a function, we need to ensure imports are at top level.
    // However, I will use the imports added at the top of the file in the next step or assume they are available if I edit the whole file. 
    // Since this is a partial replace, I'll rely on the top-level imports being present (I need to add them).
    // Actually, I should probably update the imports FIRST or do it in one go.
    // Let's do the imports first in a separate replace call if needed, or simply assume I will add them.
    // Wait, replace_file_content replaces a block. I should probably use multi_replace to handle imports and this component.

    // Let's stick to replacing this component and then I'll add imports.
    
    useEffect(() => {
        fetch(getApiUrl('/customers')).then(res => res.json()).then(res => {
            if(res.success) setCustomers(res.data);
        });
    }, []);

    const generateSOA = async () => {
        if (!selectedCustomer || !dateRange?.from || !dateRange?.to) {
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
            const res = await fetch(getApiUrl(`/reports/soa?${params.toString()}`));
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
                <CardHeader>
                    <CardTitle>Generate Statement of Account</CardTitle>
                    <CardDescription>Select a customer and date range to view their statement.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Customer</label>
                                <Popover open={openCustomer} onOpenChange={setOpenCustomer}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openCustomer}
                                            className="w-full justify-between"
                                        >
                                            {selectedCustomer
                                                ? customers.find((customer) => customer.id === selectedCustomer)?.name
                                                : "Select customer..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search customer..." />
                                            <CommandList>
                                                <CommandEmpty>No customer found.</CommandEmpty>
                                                <CommandGroup>
                                                    {customers.map((customer) => (
                                                        <CommandItem
                                                            key={customer.id}
                                                            value={customer.name}
                                                            onSelect={() => {
                                                                setSelectedCustomer(customer.id === selectedCustomer ? "" : customer.id);
                                                                setOpenCustomer(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    selectedCustomer === customer.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {customer.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="grid gap-2">
                                 <label className="text-sm font-medium">Date Range</label>
                                 <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="date"
                                            variant={"outline"}
                                            className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !dateRange && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange?.from ? (
                                            dateRange.to ? (
                                                <>
                                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                                {format(dateRange.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(dateRange.from, "LLL dd, y")
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
                                            defaultMonth={dateRange?.from}
                                            selected={dateRange}
                                            onSelect={setDateRange}
                                            numberOfMonths={2}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={generateSOA} disabled={isLoading} className="w-full md:w-auto">
                                {isLoading ? 'Generating...' : 'Generate Statement'}
                            </Button>
                        </div>
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
                        <div id="soa-print-section" className="border p-8 rounded-md bg-white text-black text-sm">
                            <div className="header border-b pb-4 mb-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                         <h1 className="text-2xl font-bold uppercase tracking-wide">Statement of Account</h1>
                                         <p className="text-muted-foreground mt-1">Stock Pilot Inc.</p>
                                    </div>
                                    <div className="text-right">
                                         <h3 className="font-semibold text-lg">{customers.find(c => c.id === selectedCustomer)?.name}</h3>
                                         <p className="text-sm text-gray-500">Statement Period: <br/>{format(new Date(soaData.period.from), 'MMM dd, yyyy')} - {format(new Date(soaData.period.to), 'MMM dd, yyyy')}</p>
                                    </div>
                                </div>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted hover:bg-muted">
                                        <TableHead className="w-[120px] font-bold text-black">Date</TableHead>
                                        <TableHead className="font-bold text-black">Description</TableHead>
                                        <TableHead className="w-[100px] font-bold text-black">Reference</TableHead>
                                        <TableHead className="text-right font-bold text-black">Debit</TableHead>
                                        <TableHead className="text-right font-bold text-black">Credit</TableHead>
                                        <TableHead className="text-right font-bold text-black">Balance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                        <TableCell>-</TableCell>
                                        <TableCell className="font-medium">Beginning Balance</TableCell>
                                        <TableCell>-</TableCell>
                                        <TableCell className="text-right">-</TableCell>
                                        <TableCell className="text-right">-</TableCell>
                                        <TableCell className="text-right font-bold">₱{Number(soaData.startingBalance).toFixed(2)}</TableCell>
                                    </TableRow>
                                    {soaData.transactions.map((t: any, i: number) => (
                                        <TableRow key={i}>
                                            <TableCell>{format(new Date(t.date), 'MMM dd, yyyy')}</TableCell>
                                            <TableCell>{t.type}</TableCell>
                                            <TableCell className="font-mono text-xs">{t.reference || t.id.substr(0,8)}</TableCell>
                                            <TableCell className="text-right">{t.debit > 0 ? `₱${Number(t.debit).toFixed(2)}` : '-'}</TableCell>
                                            <TableCell className="text-right">{t.credit > 0 ? `₱${Number(t.credit).toFixed(2)}` : '-'}</TableCell>
                                            <TableCell className="text-right font-medium">₱{Number(t.runningBalance).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-muted/50 font-bold border-t-2 border-black/10 hover:bg-muted/50">
                                        <TableCell colSpan={5} className="text-right text-base">Ending Balance</TableCell>
                                        <TableCell className="text-right text-base text-primary">₱{Number(soaData.endingBalance).toFixed(2)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                             <div className="mt-8 text-xs text-gray-400 text-center">
                                Generated on {format(new Date(), 'PPpp')}
                            </div>
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
