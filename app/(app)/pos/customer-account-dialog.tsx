
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { User, Loader2, Search, Plus, CreditCard, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Customer, SystemSettings } from '@/lib/types';
import { getApiUrl } from '@/lib/api-config';
import { format, differenceInDays } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { usePrinter } from '@/lib/use-printer';

interface CustomerAccountDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectCustomer: (customer: Customer | null) => void;
  initialCustomer?: Customer | null;
  printMode?: 'browser' | 'escpos' | 'usb' | 'native';
  settings?: SystemSettings | null;
}

export const WALK_IN_CUSTOMER: Customer = {
  id: 'walk-in',
  name: 'Walk-in Customer',
  contactNumber: '',
  paymentTerms: 'Due on receipt',
};

export function CustomerAccountDialog({ 
  isOpen, 
  onOpenChange, 
  onSelectCustomer,
  initialCustomer,
  printMode = 'native',
  settings,
}: CustomerAccountDialogProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomer?.id || 'walk-in');
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const { toast } = useToast();
  const { isConnected, connect, print } = usePrinter(printMode, settings?.nativePrinterName);

  // Payment Form State
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('Cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [activeInvoiceNo, setActiveInvoiceNo] = useState<string>('');
  const [lastPaymentData, setLastPaymentData] = useState<any>(null);
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);

  // Fetch all customers for selection
  useEffect(() => {
    if (isOpen) {
      const fetchCustomers = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(getApiUrl('/customers?limit=100'));
          const result = await response.json();
          if (result.success) {
            setCustomers(result.data);
          }
        } catch (error) {
          console.error('Failed to fetch customers:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchCustomers();
    }
  }, [isOpen]);

  // Sync with initial customer if changed externally
  useEffect(() => {
    if (initialCustomer) {
        setSelectedCustomerId(initialCustomer.id);
    } else {
        setSelectedCustomerId('walk-in');
    }
  }, [initialCustomer]);

  // Fetch selected customer details and history
  useEffect(() => {
    const fetchDetails = async () => {
      if (selectedCustomerId && selectedCustomerId !== 'walk-in') {
        // Clear previous state immediately to avoid mismatch during load
        setCustomerDetails(null);
        setTransactions([]);
        setPayments([]);
        setIsDetailsLoading(true);

        try {
          const [detailRes, transRes, payRes] = await Promise.all([
            fetch(getApiUrl(`/customers/${selectedCustomerId}`)),
            fetch(getApiUrl(`/pos/recent-sales?customerId=${selectedCustomerId}`)),
            fetch(getApiUrl(`/customers/payments?customerId=${selectedCustomerId}`))
          ]);

          const [detailData, transData, payData] = await Promise.all([
            detailRes.json(),
            transRes.json(),
            payRes.json()
          ]);

          if (detailData.success) setCustomerDetails(detailData.data);
          if (transData.success) setTransactions(transData.data);
          if (payData.success) setPayments(payData.data);
        } catch (error) {
          console.error('Failed to fetch customer details:', error);
        } finally {
          setIsDetailsLoading(false);
        }
      }
    };

    if (isOpen && selectedCustomerId) {
      if (selectedCustomerId === 'walk-in') {
        setCustomerDetails(null);
        setTransactions([]);
        setPayments([]);
      } else {
        fetchDetails();
      }
    }
  }, [isOpen, selectedCustomerId]);

  const refreshData = async () => {
    if (selectedCustomerId && selectedCustomerId !== 'walk-in') {
      setIsDetailsLoading(true);
      try {
        const [detailRes, transRes, payRes] = await Promise.all([
          fetch(getApiUrl(`/customers/${selectedCustomerId}`)),
          fetch(getApiUrl(`/pos/recent-sales?customerId=${selectedCustomerId}`)),
          fetch(getApiUrl(`/customers/payments?customerId=${selectedCustomerId}`))
        ]);

        const [detailData, transData, payData] = await Promise.all([
          detailRes.json(),
          transRes.json(),
          payRes.json()
        ]);

        if (detailData.success) setCustomerDetails(detailData.data);
        if (transData.success) setTransactions(transData.data);
        if (payData.success) setPayments(payData.data);
      } catch (error) {
        console.error('Failed to refresh data:', error);
      } finally {
        setIsDetailsLoading(false);
      }
    }
  };

  const handlePrintPaymentReceipt = async (paymentData: any) => {
    if (printMode === 'browser') {
      // Fallback browser print
      const { printPaymentReceipt } = await import('@/lib/print-payment-receipt');
      printPaymentReceipt({
        id: paymentData.reference,
        customerName: customerDetails?.name || 'Customer',
        date: paymentData.date,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentType,
        reference: paymentData.reference,
      });
      return;
    }
    // Native / ESC/POS / USB
    try {
      if (!isConnected) {
        const connected = await connect();
        if (!connected) {
          toast({ title: 'Printer Not Connected', description: 'Could not connect to the printer.', variant: 'destructive' });
          return;
        }
      }
      const { ReceiptGenerator } = await import('@/lib/receipt-generator');
      const generator = new ReceiptGenerator();
      const bytes = generator.generatePaymentReceipt({
        customerName: customerDetails?.name || 'Customer',
        date: paymentData.date,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentType,
        reference: paymentData.reference,
        note: paymentData.note,
        invoiceNo: paymentData.invoiceNo,
      }, settings);
      await print(bytes);
    } catch (e) {
      console.error('Payment receipt print error:', e);
      toast({ title: 'Print Failed', description: 'Could not send data to printer.', variant: 'destructive' });
    }
  };

  const handleSubmitPayment = async () => {
    if (!paymentAmount || isNaN(parseFloat(paymentAmount))) {
      toast({ title: "Invalid Amount", description: "Please enter a valid payment amount.", variant: "destructive" });
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const response = await fetch(getApiUrl('/customers/payments'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          amount: parseFloat(paymentAmount),
          paymentType,
          reference: paymentReference,
          note: paymentNote,
          invoiceNo: activeInvoiceNo || undefined
        })
      });

      const result = await response.json();
      if (result.success) {
        toast({ title: "Payment Recorded", description: "The customer payment has been recorded successfully." });
        // Store payment data for the print prompt
        setLastPaymentData({
          amount: parseFloat(paymentAmount),
          paymentType,
          reference: paymentReference,
          note: paymentNote,
          invoiceNo: activeInvoiceNo,
          date: new Date(),
        });
        setIsPaymentDialogOpen(false);
        // Show print prompt before re-opening main dialog
        setTimeout(() => setShowPrintPrompt(true), 200);
        // Reset form
        setPaymentAmount('');
        setPaymentReference('');
        setPaymentNote('');
        setActiveInvoiceNo('');
        refreshData();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: "Payment Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handlePaySpecific = (sale: any) => {
    const balance = sale.total - (sale.paidAmount || 0);
    // Use the actual DB reference (e.g. "INV-150106") for the invoice lookup
    const dbReference = sale.reference;
    // Use order number for display purposes
    const displayRef = sale.orderNumber || sale.receiptNo || sale.id.substring(0, 8);
    setPaymentAmount(balance.toString());
    setPaymentReference(`${displayRef}-PAY-${Date.now().toString().slice(-4)}`);
    setPaymentNote(`Payment for ${displayRef}`);
    setActiveInvoiceNo(dbReference);
    // Close main dialog first to release Radix UI focus trap, then open payment dialog
    onOpenChange(false);
    setTimeout(() => setIsPaymentDialogOpen(true), 150);
  };

  const handleSelect = () => {
    const customer = customers.find(c => c.id === selectedCustomerId) || WALK_IN_CUSTOMER;
    onSelectCustomer(customer);
    onOpenChange(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return names[0].substring(0, 2).toUpperCase();
  };

  const yesButtonRef = useRef<HTMLButtonElement>(null);
  const noButtonRef = useRef<HTMLButtonElement>(null);

  const handlePrintPromptKeyDown = (e: React.KeyboardEvent) => {
    if (!showPrintPrompt) return;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (document.activeElement === yesButtonRef.current) {
        noButtonRef.current?.focus();
      } else {
        yesButtonRef.current?.focus();
      }
    } else if (e.key.toLowerCase() === 'y') {
      e.preventDefault();
      if (lastPaymentData) handlePrintPaymentReceipt(lastPaymentData);
      setShowPrintPrompt(false);
      setLastPaymentData(null);
      onOpenChange(true);
    } else if (e.key.toLowerCase() === 'n') {
      e.preventDefault();
      setShowPrintPrompt(false);
      setLastPaymentData(null);
      onOpenChange(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowPrintPrompt(false);
      setLastPaymentData(null);
      onOpenChange(true);
    }
  };

  // Flatten transactions for "Transaction Detail" tab which shows items
  const allItems = transactions.flatMap(t => 
    t.items.map((item: any) => ({
      ...item,
      transactionDate: t.date,
      orderNumber: t.orderNumber,
      status: t.status,
      discountTotal: (item.price * item.quantity * (item.discountPercentage || 0)) / 100
    }))
  );
  
  const pendingCharges = transactions.filter(t => 
    t.status !== 'Paid' && 
    t.status !== 'Voided' && 
    (t.total - (t.paidAmount || 0)) > 0
  );

  const overdueCharges = pendingCharges.filter(t => 
    t.dueDate && new Date(t.dueDate) < new Date()
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[1000px] h-[750px] overflow-hidden flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="sr-only">Customer Account Dialog</DialogTitle>
            <DialogDescription className="sr-only">
              View and manage customer account details, credit status, and transaction history.
            </DialogDescription>
            <div className="flex justify-between items-start">
              <div className="space-y-4 w-full">
                <div className="flex items-center gap-4">
                  <div className="flex-grow">
                    <p className="text-sm font-medium mb-1">Customer</p>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger className="w-full sm:w-[300px]">
                        <SelectValue placeholder="Select Customer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedCustomerId !== 'walk-in' && (
                    <Avatar className="h-24 w-24">
                      <AvatarFallback className="text-2xl bg-muted">{getInitials(customerDetails?.name || '')}</AvatarFallback>
                    </Avatar>
                  )}
                </div>

                {selectedCustomerId !== 'walk-in' && customerDetails && (
                  <div className="flex justify-between items-end">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm flex-grow">
                      <p><span className="font-semibold text-muted-foreground mr-2">Code:</span> {customerDetails.id}</p>
                      <p><span className="font-semibold text-muted-foreground mr-2">Credit Limit:</span> {formatCurrency(customerDetails.credit_limit || 0)}</p>
                      <p><span className="font-semibold text-muted-foreground mr-2">Full Name:</span> {customerDetails.name}</p>
                      <p><span className="font-semibold text-muted-foreground mr-2">Credit Sales:</span> {formatCurrency(customerDetails.credit_sales || 0)}</p>
                      <p><span className="font-semibold text-muted-foreground mr-2">Contact:</span> {customerDetails.contact_number}</p>
                      <p><span className="font-semibold text-muted-foreground mr-2">Total Payment:</span> {formatCurrency(customerDetails.total_payment || 0)}</p>
                      <p><span className="font-semibold text-muted-foreground mr-2">Address:</span> {customerDetails.address || 'N/A'}</p>
                      <p><span className="font-semibold text-muted-foreground mr-2">Current Balance:</span> <span className="text-cyan-500 font-bold">{formatCurrency(customerDetails.balance || 0)}</span></p>
                    </div>
                  </div>
                )}
                
                {selectedCustomerId === 'walk-in' && !isDetailsLoading && (
                    <div className="p-8 text-center text-muted-foreground italic border rounded-lg bg-muted/30">
                        Walk-in customers do not have detailed transaction or credit history tracking.
                    </div>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="mt-4 flex-grow overflow-hidden flex flex-col">
            <Tabs defaultValue="transactions" className="w-full flex-grow flex flex-col">
              <TabsList className="justify-start border-b rounded-none bg-transparent h-auto p-0 mb-2">
                <TabsTrigger value="transactions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Transaction Detail</TabsTrigger>
                <TabsTrigger value="charges" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Charges Detail</TabsTrigger>
                <TabsTrigger value="overdue" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Overdue</TabsTrigger>
                <TabsTrigger value="payments" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Payment Detail</TabsTrigger>
                <TabsTrigger value="pending" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2">Pending Charges</TabsTrigger>
              </TabsList>
              
              <div className="flex-grow overflow-auto border rounded-md bg-card">
                <TabsContent value="transactions" className="m-0">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Transaction Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isDetailsLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mr-2 inline-block" />
                            Loading transaction data...
                          </TableCell>
                        </TableRow>
                      ) : allItems.length > 0 ? (
                        allItems.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{item.product.name}</TableCell>
                            <TableCell>{formatCurrency(item.price)}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.price * item.quantity)}</TableCell>
                            <TableCell>{formatCurrency(item.discountTotal || 0)}</TableCell>
                            <TableCell>{format(new Date(item.transactionDate), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>{item.status}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            No transactions found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
                
                <TabsContent value="payments" className="m-0">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isDetailsLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mr-2 inline-block" />
                            Loading payment history...
                          </TableCell>
                        </TableRow>
                      ) : payments.length > 0 ? (
                        payments.map((payment, idx) => (
                          <TableRow key={idx}>
                             <TableCell>{format(new Date(payment.paymentDate), 'MMM dd, yyyy')}</TableCell>
                             <TableCell>{payment.reference}</TableCell>
                             <TableCell>{payment.paymentType}</TableCell>
                             <TableCell>{formatCurrency(payment.amount)}</TableCell>
                             <TableCell className="max-w-[200px] truncate">{payment.note}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            No payments found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="charges" className="m-0">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Paid Amount</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isDetailsLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mr-2 inline-block" />
                            Loading charges...
                          </TableCell>
                        </TableRow>
                      ) : transactions.length > 0 ? (
                        transactions.map((sale, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{format(new Date(sale.date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell className="font-medium text-primary">{sale.orderNumber || sale.receiptNo || sale.id.substring(0, 8)}</TableCell>
                            <TableCell>{formatCurrency(sale.total)}</TableCell>
                            <TableCell>{formatCurrency(sale.paidAmount || 0)}</TableCell>
                            <TableCell className="font-bold text-red-500">{formatCurrency(sale.total - (sale.paidAmount || 0))}</TableCell>
                            <TableCell>
                               <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                 sale.status === 'Paid' ? 'bg-green-100 text-green-700' : 
                                 sale.status === 'Voided' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                               }`}>
                                 {sale.status}
                               </span>
                            </TableCell>
                            <TableCell className="text-right">
                               {(sale.total - (sale.paidAmount || 0)) > 0 && sale.status !== 'Voided' && (
                                 <Button variant="ghost" size="sm" className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handlePaySpecific(sale)}>
                                   Pay
                                 </Button>
                               )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            No charge history found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="overdue" className="m-0">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Days Overdue</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isDetailsLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mr-2 inline-block" />
                            Checking overdue status...
                          </TableCell>
                        </TableRow>
                      ) : overdueCharges.length > 0 ? (
                        overdueCharges.map((sale, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{format(new Date(sale.date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell className="font-medium text-primary">{sale.orderNumber || sale.receiptNo || sale.id.substring(0, 8)}</TableCell>
                            <TableCell className="text-red-500 font-medium">{format(new Date(sale.dueDate!), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>{formatCurrency(sale.total)}</TableCell>
                            <TableCell className="font-bold text-red-500">{formatCurrency(sale.total - (sale.paidAmount || 0))}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                {differenceInDays(new Date(), new Date(sale.dueDate!))} days
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handlePaySpecific(sale)}>
                                  Pay
                                </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            No overdue charges found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="pending" className="m-0">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isDetailsLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mr-2 inline-block" />
                            Loading pending records...
                          </TableCell>
                        </TableRow>
                      ) : pendingCharges.length > 0 ? (
                        pendingCharges.map((sale, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{format(new Date(sale.date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell className="font-medium text-primary">{sale.orderNumber || sale.receiptNo || sale.id.substring(0, 8)}</TableCell>
                            <TableCell>{sale.dueDate ? format(new Date(sale.dueDate), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                            <TableCell>{formatCurrency(sale.total)}</TableCell>
                            <TableCell className="font-bold text-amber-600">{formatCurrency(sale.total - (sale.paidAmount || 0))}</TableCell>
                            <TableCell>
                               <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-700">
                                 {sale.status}
                               </span>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handlePaySpecific(sale)}>
                                  Pay
                                </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            No pending charges found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSelect}>Confirm Selection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Sub-Dialog — opens after main dialog closes to avoid Radix focus trap conflict */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsPaymentDialogOpen(false);
          // Restore main dialog when user cancels payment
          onOpenChange(true);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Make Charge Payment</DialogTitle>
            <DialogDescription>
              Record a payment for {customerDetails?.name || 'customer'}. This will decrease their outstanding balance.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                className="col-span-3"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">Type</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Payment Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Check">Check</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="E-Wallet">E-Wallet</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ref" className="text-right">Ref #</Label>
              <Input
                id="ref"
                placeholder="Check # or Ref #"
                className="col-span-3"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">Notes</Label>
              <Input
                id="notes"
                placeholder="Optional notes"
                className="col-span-3"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmitPayment} 
              disabled={isSubmittingPayment}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmittingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Prompt — shown after payment recorded */}
      <Dialog open={showPrintPrompt} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[360px]" onInteractOutside={(e) => e.preventDefault()} onKeyDown={handlePrintPromptKeyDown}>
          <DialogHeader>
            <DialogTitle>Print Receipt?</DialogTitle>
            <DialogDescription>
              Would you like to print a payment receipt for {customerDetails?.name || 'this customer'}?
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-2">
            <p className="text-2xl font-black text-emerald-600">
              {lastPaymentData ? formatCurrency(lastPaymentData.amount) : ''}
            </p>
            <p className="text-sm text-muted-foreground">{lastPaymentData?.paymentType}</p>
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setShowPrintPrompt(false);
                setLastPaymentData(null);
                onOpenChange(true);
              }}
              ref={noButtonRef}
            >
              No
            </Button>
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={async () => {
                if (lastPaymentData) await handlePrintPaymentReceipt(lastPaymentData);
                setShowPrintPrompt(false);
                setLastPaymentData(null);
                onOpenChange(true);
              }}
              ref={yesButtonRef}
              autoFocus
            >
              <Printer className="mr-2 h-4 w-4" />
              Yes, Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
