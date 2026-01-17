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

interface SupplierTransactionDialogProps {
  supplierId: string;
  supplierName: string;
  trigger?: React.ReactNode;
}

export function SupplierTransactionDialog({ supplierId, supplierName, trigger }: SupplierTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadTransactions();
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

    const headers = ['Date', 'Type', 'Reference', 'Description', 'Amount'];
    const rows = transactions.map(txn => [
      format(new Date(txn.date), 'yyyy-MM-dd'),
      txn.type,
      txn.reference || '',
      `"${txn.description.replace(/"/g, '""')}"`, // Escape quotes
      txn.amount.toFixed(2)
    ]);

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
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f2f2f2; }
            .text-right { text-align: right; }
            .positive { color: #dc2626; } /* Red for debt increase */
            .negative { color: #059669; } /* Green for payments */
          </style>
        </head>
        <body>
          <h1>${supplierName}</h1>
          <p>Transaction History - Printed on ${format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Reference</th>
                <th>Description</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${transactions.map(txn => `
                <tr>
                  <td>${format(new Date(txn.date), 'MMM dd, yyyy')}</td>
                  <td>${txn.type}</td>
                  <td>${txn.reference || '-'}</td>
                  <td>${txn.description}</td>
                  <td class="text-right ${txn.type === 'PURCHASE' ? 'positive' : 'negative'}">
                    ₱${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
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
      <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
              <div>
                  <DialogTitle>Transaction History</DialogTitle>
                  <DialogDescription>
                    Transactions for {supplierName}
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
        
        <div className="flex-1 overflow-auto mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((txn) => (
                  <TableRow key={`${txn.type}-${txn.id}`}>
                    <TableCell className="whitespace-nowrap">
                        {format(new Date(txn.date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                        {txn.type === 'PURCHASE' ? (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400">
                                Purchase
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400">
                                Payment
                            </Badge>
                        )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                        {txn.reference || '-'}
                    </TableCell>
                    <TableCell>{txn.description}</TableCell>
                    <TableCell className="text-right font-medium">
                        {txn.type === 'PURCHASE' ? (
                             <span className="text-red-600 dark:text-red-400 flex items-center justify-end gap-1">
                                <ArrowUpRight className="h-3 w-3" />
                                ₱{txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                             </span>
                        ) : (
                             <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                                <ArrowDownLeft className="h-3 w-3" />
                                ₱{txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                             </span>
                        )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
