
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
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer, ArrowLeft, Package2 } from 'lucide-react';
import type { Sale } from '@/lib/types';
import { format } from 'date-fns';
import { Logo } from '@/components/logo';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdminAuthDialog } from './admin-auth-dialog';


interface RecentSalesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}


// ... (existing printReceipt, formatCurrency, ReceiptPrintView helper functions preserved)
const printReceipt = (sale: Sale) => {
    // Adapter to match tender-dialog structure
    const items = sale.items.map(item => ({
        name: item.product.name,
        price: item.price,
        quantity: item.quantity,
        unitOfMeasure: item.product.unitOfMeasure,
        discount: 0 // Default to 0 if not stored
    }));

    const totalDue = sale.total;
    // Recalculate if needed, or rely on sale.total
    const subTotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const totalDiscount = 0; // Assuming no discount stored in simple history for now, or calculate if available
    const vatAmount = (totalDue / 1.12) * 0.12;
    // Change calculation (Recents might not allow knowing exact tendered if not stored, tender dialog used state)
    // For reprint, we usually just show Total if payment details aren't granular.
    // However, if we want "Change", we'd need amountTendered stored in Sale.
    // If not available, we can omit Change or show 0.
    const change = 0; 
    const paymentMethod = sale.paymentMethod;
    const orderNumber = sale.orderNumber || sale.id; // Use SO number

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const receiptContent = `
        <html>
        <head>
            <title>Receipt</title>
            <style>
                @page {
                    margin: 0;
                    size: 58mm auto;
                }
                html, body {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                }
                body {
                    font-family: 'Arial', 'Helvetica', sans-serif;
                    font-size: 10px;
                    color: #000000 !important;
                    font-weight: 600;
                    -webkit-font-smoothing: antialiased;
                    -webkit-print-color-adjust: exact;
                    text-rendering: optimizeLegibility;
                }
                .receipt-container {
                    width: 48mm; /* Strictly enforce 48mm printable area */
                    margin: 0 auto;
                    padding: 4px 0;
                    box-sizing: border-box;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: 800; }
                .mb-1 { margin-bottom: 4px; }
                .mb-2 { margin-bottom: 8px; }
                .mb-4 { margin-bottom: 16px; }
                .border-b { border-bottom: 1.5px dashed black; }
                .border-t { border-top: 1.5px dashed black; }
                .flex { display: flex; justify-content: space-between; }
                .item-row { display: flex; align-items: flex-start; margin-bottom: 2px; }
                .item-row { display: flex; align-items: flex-start; margin-bottom: 2px; }
                .qty { width: 32px; text-align: left; flex-shrink: 0; white-space: nowrap; font-size: 9px; }
                .name { flex-grow: 1; white-space: normal; overflow-wrap: break-word; padding-right: 4px; text-align: left; }
                .price { width: 35px; text-align: right; flex-shrink: 0; }
                .text-sm { font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <div class="text-center mb-4">
                    <div class="font-bold" style="font-size: 14px;">STOCK PILOT</div>
                    <div>General Merchandise</div>
                    <div>${format(new Date(sale.date || new Date()), 'PP p')}</div>
                </div>

                <div class="mb-2 border-b pb-2">
                    <div>Sale Details</div>
                    <div class="font-bold">Order #: ${orderNumber}</div>
                    <div>Cust: ${sale.customer.name}</div>
                    <div>Cashier: Admin</div>
                </div>

                <div class="mb-2">
                    <div class="item-row font-bold border-b mb-1">
                        <span class="qty">Qty</span>
                        <span class="name">Item</span>
                        <span class="price">Amt</span>
                    </div>
                    ${items.map((item: any) => `
                        <div class="item-row">
                            <span class="qty">${item.quantity} ${item.unitOfMeasure || ''}</span>
                            <span class="name">
                                <div>${item.name}</div>
                                <div style="font-size: 9px;">@ ${formatCurrency(item.price)}</div>
                            </span>
                            <span class="price">${formatCurrency(item.price * item.quantity)}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="border-t pt-2 mb-2">
                    <div class="flex">
                        <span>Subtotal:</span>
                        <span>${formatCurrency(subTotal)}</span>
                    </div>
                    ${totalDiscount > 0 ? `
                        <div class="flex">
                            <span>Discount:</span>
                            <span>-${formatCurrency(totalDiscount)}</span>
                        </div>
                    ` : ''}
                    <div class="flex font-bold text-sm mt-2">
                        <span>TOTAL:</span>
                        <span>${formatCurrency(totalDue)}</span>
                    </div>
                    <div class="flex" style="font-size: 9px;">
                        <span>VAT (12%):</span>
                        <span>${formatCurrency(vatAmount)}</span>
                    </div>
                </div>

                <div class="border-t pt-2 mb-2">
                     <div class="flex font-bold">
                        <span>${paymentMethod}:</span>
                        <span>${formatCurrency(totalDue)}</span>
                    </div>
                </div>

                <div class="text-center mt-6">
                    <div>Thank you for your purchase!</div>
                    <div style="font-size: 9px;">Pos System by Bhagoh</div>
                </div>
            </div>
        </body>
        </html>
    `;

    doc.open();
    doc.write(receiptContent);
    doc.close();

    // Use sequential flow instead of onload to avoid double filtering
    setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 1000);
    }, 500);
};

const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function ReceiptPrintView({ sale, onBack }: { sale: Sale; onBack: () => void }) {
    return (
        <div className="printable-area">
            <CardHeader className="pr-10">
                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 mb-2">
                             <Button variant="outline" size="icon" onClick={onBack} className="non-printable shrink-0">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <CardTitle>Sale Receipt</CardTitle>
                        </div>
                        <CardDescription className="break-all">SO Number: {sale.orderNumber || sale.id}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-primary">
                        <Package2 className="h-6 w-6" />
                        <h1 className="text-xl font-semibold font-headline">StockPilot</h1>
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground pt-4">
                  <div>
                      <p className="font-semibold text-foreground">Customer:</p>
                      <p>{sale.customer.name}</p>
                  </div>
                  <div>
                      <p className="font-semibold text-foreground">Date:</p>
                      <p>{format(new Date(sale.date || new Date()), 'PPp')}</p>
                  </div>
              </div>
            </CardHeader>
            <CardContent>
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sale.items.map(item => (
                    <TableRow key={item.product.id}>
                      <TableCell>{item.product.name}</TableCell>
                      <TableCell>{item.product.unitOfMeasure}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">₱{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right">₱{formatCurrency(item.price * item.quantity)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 border-primary">
                      <TableCell colSpan={4} className="text-right font-bold text-lg">Total</TableCell>
                      <TableCell className="text-right font-bold text-lg">₱{formatCurrency(sale.total)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Thank you for your purchase!
              </div>
          </CardContent>
          <div className="flex justify-end mt-4 p-6 pt-0 non-printable">
              <Button onClick={() => printReceipt(sale)}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Receipt
              </Button>
          </div>
        </div>
    );
}

export function RecentSalesDialog({
  isOpen,
  onOpenChange,
}: RecentSalesDialogProps) {
  const [step, setStep] = useState<'loading' | 'auth' | 'list'>('loading');
  const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [posSettings, setPosSettings] = useState<any>(null);
  const authSucceededRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
        authSucceededRef.current = false;
        setStep('loading');
        setIsLoading(true);
        setSaleToPrint(null);
        
        // Fetch settings first to determine step
        fetch(`/api/pos-settings?_t=${Date.now()}`, { cache: 'no-store' })
          .then(res => res.json())
          .then(result => {
             if (result.success) {
                 const settings = result.data;
                 setPosSettings(settings);
                 
                 if (settings.enableRecentSalesAuth) {
                     setStep('auth');
                 } else {
                     setStep('list');
                 }
            } else {
                setStep('list'); // Fallback
            }
          })
          .catch(err => {
              console.error(err);
              setStep('list');
          });

        const fetchRecentSales = async () => {
            try {
                const response = await fetch(`/api/pos/recent-sales`);
                const result = await response.json();
                
                if (result.success) {
                setRecentSales(result.data);
                } else {
                console.error('Failed to fetch recent sales:', result.error);
                }
            } catch (error) {
                console.error('Error fetching recent sales:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRecentSales();
    }
  }, [isOpen]);
  
  const handleAuthSuccess = () => {
      authSucceededRef.current = true;
      setStep('list');
  };

  const handleAuthClose = (open: boolean) => {
      if (!open && !authSucceededRef.current) {
          onOpenChange(false);
      }
      authSucceededRef.current = false;
  };

  const handlePrintReceipt = (sale: Sale) => {
    setSaleToPrint(sale);
  };
  
  const handleBackToList = () => {
    setSaleToPrint(null);
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSaleToPrint(null);
    }
    onOpenChange(open);
  }

  return (
    <>
    <Dialog open={isOpen && (step === 'list')} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        {saleToPrint ? (
            <ReceiptPrintView sale={saleToPrint} onBack={handleBackToList} />
        ) : (
        <>
            <DialogHeader>
            <div className="flex items-center justify-between">
                <div>
                    <DialogTitle>Recent Transactions</DialogTitle>
                    <DialogDescription>
                        A list of the 20 most recent sales.
                    </DialogDescription>
                </div>

            </div>
            </DialogHeader>
            <ScrollArea className="h-96">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>SO Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {isLoading && (
                    <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        Loading recent sales...
                    </TableCell>
                    </TableRow>
                )}
                {!isLoading && recentSales && recentSales.length > 0 ? (
                    recentSales.map((sale) => (
                    <TableRow key={sale.id}>
                        <TableCell className="font-mono">{sale.orderNumber ? sale.orderNumber : sale.id.substring(0, 7)}</TableCell>
                        <TableCell>{sale.customer.name}</TableCell>
                        <TableCell>{format(new Date(sale.date || new Date()), 'p')}</TableCell>
                        <TableCell className="text-right">₱{sale.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                            <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrintReceipt(sale)}
                            >
                            <Printer className="mr-2 h-4 w-4" />
                            Reprint
                            </Button>
                        </div>
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    !isLoading && (
                        <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No recent sales found.
                        </TableCell>
                        </TableRow>
                    )
                )}
                </TableBody>
            </Table>
            </ScrollArea>
            <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
            </Button>
            </DialogFooter>
        </>
        )}
      </DialogContent>
    </Dialog>

    <AdminAuthDialog
        isOpen={isOpen && step === 'auth'}
        onOpenChange={handleAuthClose}
        onSuccess={handleAuthSuccess}
        requiredCredentials={posSettings?.enableRecentSalesAuth ? {
            username: posSettings.recentSalesAuthUsername,
            password: posSettings.recentSalesAuthPassword
        } : null}
        title="Recent Sales Authorization"
        description="Enter authorized credentials to view recent sales."
      />
    </>
  );
}
