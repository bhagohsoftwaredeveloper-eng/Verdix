'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, Loader2, ArrowUpRight, ArrowDownLeft, Printer, Download } from 'lucide-react';
import { getSupplierTransactions, SupplierTransaction } from '../actions';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Search, Calendar as CalendarIcon, Wallet, CreditCard, Receipt } from 'lucide-react';

interface SupplierTransactionDialogProps {
  supplierId: string;
  supplierName: string;
  trigger?: React.ReactNode;
}

export function SupplierTransactionDialog({ supplierId, supplierName, trigger }: SupplierTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    if (open) {
      loadTransactions();
      setCurrentPage(1);
    }
  }, [open, supplierId]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await getSupplierTransactions(supplierId);
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load transactions', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!transactions.length) return;

    const headers = ['PO Reference', 'PO Total', 'Date', 'Type', 'Description', 'Amount', 'Reference'];
    const rows: string[][] = [];

    transactions.forEach(txn => {
      // Add the main transaction (PO or Unallocated Payment)
      rows.push([
        txn.reference || '',
        txn.type === 'PURCHASE' ? txn.amount.toFixed(2) : '',
        format(new Date(txn.date), 'yyyy-MM-dd'),
        txn.type,
        `"${txn.description.replace(/"/g, '""')}"`,
        txn.amount.toFixed(2),
        txn.reference || ''
      ]);

      // Add related payments if it's a PO
      if (txn.payments && txn.payments.length > 0) {
        txn.payments.forEach(pay => {
          rows.push([
            txn.reference || '',
            '',
            format(new Date(pay.date), 'yyyy-MM-dd'),
            'ALLOCATED PAYMENT',
            `"Payment via ${pay.paymentMethod}"`,
            pay.amount.toFixed(2),
            pay.reference || ''
          ]);
        });
      }
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${supplierName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTransactions = transactions.filter(txn => {
    const matchesSearch = !searchTerm || 
      (txn.reference?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (txn.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const txnDate = new Date(txn.date);
    const matchesStartDate = !startDate || txnDate >= new Date(startDate);
    const matchesEndDate = !endDate || txnDate <= new Date(endDate);
    
    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  const totalPages = Math.ceil(filteredTransactions.length / pageSize);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const summary = filteredTransactions.reduce((acc, txn) => {
    if (txn.type === 'PURCHASE') {
      acc.totalPurchases += txn.amount;
      acc.totalPaid += (txn.paidAmount || 0);
    } else {
      acc.totalPaid += txn.amount;
    }
    return acc;
  }, { totalPurchases: 0, totalPaid: 0 });

  const currentBalance = summary.totalPurchases - summary.totalPaid;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Transaction History - ${supplierName}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { margin-bottom: 5px; }
            p { color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
            th { background-color: #f2f2f2; }
            .text-right { text-align: right; }
            .po-row { background-color: #f9fafb; font-weight: bold; }
            .payment-row { color: #666; font-style: italic; }
            .positive { color: #dc2626; }
            .negative { color: #059669; }
          </style>
        </head>
        <body>
          <h1>${supplierName}</h1>
          <p>Transaction History - Printed on ${format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Description</th>
                <th class="text-right">Total</th>
                <th class="text-right">Paid</th>
                <th class="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(txn => `
                <tr class="po-row">
                  <td>${format(new Date(txn.date), 'MMM dd, yyyy')}</td>
                  <td>${txn.type === 'PURCHASE' ? txn.reference : (txn.reference || '-')}</td>
                  <td>${txn.description}</td>
                  <td class="text-right">₱${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td class="text-right">₱${(txn.paidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td class="text-right">₱${(txn.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
                ${txn.payments?.map(pay => `
                   <tr class="payment-row">
                      <td style="padding-left: 20px;">${format(new Date(pay.date), 'MMM dd, yyyy')}</td>
                      <td>${pay.reference || '-'}</td>
                      <td>Allocation: ${pay.paymentMethod}</td>
                      <td class="text-right">-</td>
                      <td class="text-right">₱${pay.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td class="text-right">-</td>
                   </tr>
                `).join('') || ''}
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            History
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
              <div>
                  <DialogTitle>Transaction History</DialogTitle>
                  <DialogDescription>
                    Purchase order history and payment allocations for {supplierName}
                  </DialogDescription>
              </div>
              <div className="flex gap-2">
                 <Button variant="outline" size="sm" onClick={handlePrint} disabled={loading || transactions.length === 0}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                 </Button>
                 <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={loading || transactions.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                 </Button>
              </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto mt-4 px-1">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading history...</p>
             </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/30 border rounded-lg p-3 flex items-center gap-3">
                  <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full">
                    <Receipt className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">Total Purchases</p>
                    <p className="text-sm font-bold">₱{summary.totalPurchases.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className="bg-muted/30 border rounded-lg p-3 flex items-center gap-3">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-full">
                    <CreditCard className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">Total Paid</p>
                    <p className="text-sm font-bold">₱{summary.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className="bg-muted/30 border rounded-lg p-3 flex items-center gap-3">
                  <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
                    <Wallet className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">Current Balance</p>
                    <p className="text-sm font-bold text-red-600">₱{currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-muted/20 p-4 rounded-lg border border-dashed">
                <div className="md:col-span-2 space-y-1.5">
                  <Label htmlFor="search" className="text-[10px] uppercase font-bold text-muted-foreground">Search History</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="PO # or Reference..."
                      className="pl-8 h-9 text-xs"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="startDate" className="text-[10px] uppercase font-bold text-muted-foreground">From</Label>
                  <Input
                    id="startDate"
                    type="date"
                    className="h-9 text-xs"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endDate" className="text-[10px] uppercase font-bold text-muted-foreground">To</Label>
                  <Input
                    id="endDate"
                    type="date"
                    className="h-9 text-xs"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                  No transactions found matching your filters.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-4">
                    {paginatedTransactions.map((txn) => (
                      <div key={`${txn.type}-${txn.id}`} className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                        <div className={`flex items-center justify-between p-4 ${txn.type === 'PURCHASE' ? 'bg-muted/30' : 'bg-emerald-50 dark:bg-emerald-950/20'}`}>
                          <div className="grid grid-cols-4 gap-4 flex-1">
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase text-muted-foreground font-semibold">Date</span>
                              <span className="text-sm font-medium">{format(new Date(txn.date), 'MMM dd, yyyy')}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase text-muted-foreground font-semibold">Reference</span>
                              <span className="text-sm font-mono">{txn.reference || '-'}</span>
                            </div>
                            <div className="flex flex-col col-span-2">
                              <span className="text-[10px] uppercase text-muted-foreground font-semibold">Type</span>
                              <div className="flex items-center gap-2">
                                {txn.type === 'PURCHASE' ? (
                                    <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-none h-5">
                                      Purchase Order
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-none h-5">
                                      Unallocated Payment
                                    </Badge>
                                )}
                                <span className="text-xs text-muted-foreground italic truncate">{txn.description}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end min-w-[120px]">
                            <span className="text-[10px] uppercase text-muted-foreground font-semibold">Total Amount</span>
                            <span className={`text-sm font-bold ${txn.type === 'PURCHASE' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                ₱{txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {txn.type === 'PURCHASE' && (
                          <div className="border-t">
                            <div className="grid grid-cols-3 bg-muted/10 px-4 py-2 border-b">
                                <div className="flex flex-col">
                                  <span className="text-[10px] uppercase text-muted-foreground">Status</span>
                                  <Badge variant="outline" className={`w-fit h-5 text-[10px] ${
                                      txn.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                      txn.status === 'Partially Paid' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                      'bg-orange-50 text-orange-700 border-orange-200'
                                  }`}>
                                      {txn.status}
                                  </Badge>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] uppercase text-muted-foreground">Paid</span>
                                  <span className="text-sm font-medium text-emerald-600">₱{(txn.paidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="text-[10px] uppercase text-muted-foreground">Balance</span>
                                  <span className={`text-sm font-bold ${txn.balance && txn.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                      ₱{(txn.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                            </div>
                            
                            {txn.payments && txn.payments.length > 0 ? (
                                <div className="p-0">
                                  <Table>
                                      <TableHeader className="bg-muted/5">
                                        <TableRow className="h-8">
                                            <TableHead className="text-[10px] h-8">Date</TableHead>
                                            <TableHead className="text-[10px] h-8">Method</TableHead>
                                            <TableHead className="text-[10px] h-8">Reference</TableHead>
                                            <TableHead className="text-right text-[10px] h-8">Amount</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {txn.payments.map((pay) => (
                                            <TableRow key={pay.id} className="h-8">
                                              <TableCell className="py-2 text-xs">{format(new Date(pay.date), 'MMM dd, yyyy')}</TableCell>
                                              <TableCell className="py-2 text-xs">{pay.paymentMethod}</TableCell>
                                              <TableCell className="py-2 text-xs font-mono text-muted-foreground">{pay.reference || '-'}</TableCell>
                                              <TableCell className="py-2 text-right text-xs font-semibold text-emerald-600">
                                                  ₱{pay.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                              </TableCell>
                                            </TableRow>
                                        ))}
                                      </TableBody>
                                  </Table>
                                </div>
                            ) : (
                                <div className="p-4 text-center text-xs text-muted-foreground italic">
                                  No payments recorded for this order.
                                </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pagination Control */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredTransactions.length)} of {filteredTransactions.length} transactions
                      </p>
                      <Pagination className="w-auto">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          
                          {[...Array(totalPages)].map((_, i) => (
                            <PaginationItem key={i + 1} className="hidden md:inline-block">
                              <PaginationLink 
                                onClick={() => setCurrentPage(i + 1)}
                                isActive={currentPage === i + 1}
                                className="cursor-pointer"
                              >
                                {i + 1}
                              </PaginationLink>
                            </PaginationItem>
                          ))}

                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
