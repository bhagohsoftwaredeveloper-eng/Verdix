
'use client';

import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Printer } from 'lucide-react';
import type { SaleItem } from './page';
import type { Customer } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';

interface TenderDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    paymentMethod: string;
    totalDue: number;
    items: SaleItem[];
    customer: Customer | null;
    currentUser: any;
    onSuccess: (paymentMethod: string, amount: number) => void;
    shiftId: string | null;
    terminalId: string;
}

const printReceipt = (saleDetails: any) => {
    const { items, customer, totalDue, change, paymentMethod, orderNumber } = saleDetails;
    const subTotal = items.reduce((acc: any, item: any) => acc + item.price * item.quantity, 0);
    const totalDiscount = items.reduce((acc: any, item: any) => acc + (item.price * item.quantity * item.discount) / 100, 0);
    const vatAmount = (totalDue / 1.12) * 0.12;

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
                .qty { width: 20px; text-align: center; flex-shrink: 0; }
                .name { flex-grow: 1; white-space: normal; overflow-wrap: break-word; padding-right: 4px; text-align: center; }
                .price { width: 35px; text-align: right; flex-shrink: 0; }
                .text-sm { font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <div class="text-center mb-4">
                    <div class="font-bold" style="font-size: 14px;">STOCK PILOT</div>
                    <div>General Merchandise</div>
                    <div>${format(new Date(), 'PP p')}</div>
                </div>

                <div class="mb-2 border-b pb-2">
                    <div>Sale Details</div>
                    <div class="font-bold">Order #: ${orderNumber || 'N/A'}</div>
                    <div>Cust: ${customer?.name || 'Walk-in'}</div>
                    <div>Cashier: Admin</div>
                </div>

                <div class="mb-2">
                    <div class="item-row font-bold border-b mb-1">
                        <span class="qty">Qty</span>
                        <span class="name text-center">Item</span>
                        <span class="price">Amt</span>
                    </div>
                    ${items.map((item: any) => `
                        <div class="item-row">
                            <span class="qty">${item.quantity}</span>
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
                        <span>${paymentMethod === 'CASH' ? formatCurrency((saleDetails as any).amountTendered || (totalDue + change)) : formatCurrency(totalDue)}</span>
                    </div>
                     ${paymentMethod === 'CASH' ? `
                        <div class="flex">
                            <span>Change:</span>
                            <span>${formatCurrency(change)}</span>
                        </div>
                     ` : ''}
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
        // Remove iframe after printing (give it some time to process)
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 1000);
    }, 500);
};

function ReceiptView({
    saleDetails,
    onNewSale,
    onPrint
}: {
    saleDetails: {
        items: SaleItem[],
        customer: Customer | null,
        totalDue: number,
        change: number,
        paymentMethod: string,
        orderNumber?: string,
    };
    onNewSale: () => void;
    onPrint: () => void;
}) {
    const { items, customer, totalDue, change, paymentMethod } = saleDetails;
    const subTotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const totalDiscount = items.reduce((acc, item) => acc + (item.price * item.quantity * item.discount) / 100, 0);
    const vatAmount = (totalDue / 1.12) * 0.12;

    const formatCurrency = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const hasPrinted = useRef(false);

    useEffect(() => {
        if (!hasPrinted.current) {
            onPrint();
            hasPrinted.current = true;
        }
    }, []);

    return (
        <div className="flex flex-col h-full">
            {/* Screen Preview */}
            <div className="printable-area max-w-[300px] mx-auto bg-white text-black p-4 text-xs font-mono border shadow-sm my-4">
                <div className="text-center mb-4">
                    <div className="font-bold text-lg mb-1">STOCK PILOT</div>
                    <div>General Merchandise</div>
                    <div className="text-[10px]">{format(new Date(), 'PP p')}</div>
                </div>

                <div className="mb-2 border-b border-dashed border-black pb-2">
                    <div>Sale Details</div>
                    <div className="font-bold">Order #: {saleDetails.orderNumber || 'N/A'}</div>
                    <div>Cust: {customer?.name || 'Walk-in'}</div>
                    <div>Cashier: Admin</div>
                </div>

                <div className="mb-2">
                    <div className="flex justify-between font-bold border-b border-black mb-1">
                        <span className="w-8 text-center">Qty</span>
                        <span className="flex-1 text-center">Item</span>
                        <span className="w-12 text-right">Amt</span>
                    </div>
                    {items.map(item => (
                        <div key={item.id} className="flex justify-between mb-1 items-start">
                            <span className="w-8 text-center">{item.quantity}</span>
                            <span className="flex-1 text-center px-1">
                                <div>{item.name}</div>
                                <div className="text-[10px] text-muted-foreground">@ {formatCurrency(item.price)}</div>
                            </span>
                            <span className="w-12 text-right">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                    ))}
                </div>

                <div className="border-t border-dashed border-black pt-2 space-y-1">
                    <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(subTotal)}</span>
                    </div>
                    {totalDiscount > 0 && (
                        <div className="flex justify-between">
                           <span>Discount:</span>
                           <span>-{formatCurrency(totalDiscount)}</span>
                       </div>
                    )}
                    <div className="flex justify-between font-bold text-sm mt-2">
                        <span>TOTAL:</span>
                        <span>{formatCurrency(totalDue)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                        <span>VAT (12%):</span>
                        <span>{formatCurrency(vatAmount)}</span>
                    </div>
                </div>

                <div className="border-t border-black my-2"></div>

                <div className="space-y-1">
                     <div className="flex justify-between font-bold">
                        <span>{paymentMethod}:</span>
                        <span>{paymentMethod === 'CASH' ? formatCurrency((saleDetails as any).amountTendered || (totalDue + change)) : formatCurrency(totalDue)}</span>
                    </div>
                     {paymentMethod === 'CASH' && (
                        <div className="flex justify-between">
                            <span>Change:</span>
                            <span>{formatCurrency(change)}</span>
                        </div>
                     )}
                </div>

                <div className="text-center mt-6 mb-2">
                    <div>Thank you for your purchase!</div>
                    <div className="text-[10px]">Pos System by Bhagoh</div>
                </div>
            </div>

            <DialogFooter className="mt-auto">
                <Button variant="outline" onClick={onNewSale}>New Sale</Button>
                <Button onClick={onPrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Again
                </Button>
            </DialogFooter>
        </div>
    );
}


export function TenderDialog({
    isOpen,
    onOpenChange,
    paymentMethod,
    totalDue,
    items,
    customer,
    currentUser,
    onSuccess,
    shiftId,
    terminalId,
}: TenderDialogProps) {
    const [amountTendered, setAmountTendered] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [view, setView] = useState<'tender' | 'receipt'>('tender');
    const [completedSale, setCompletedSale] = useState<any>(null);
    const { toast } = useToast();
    const [printMode, setPrintMode] = useState<'driver' | 'escpos'>('driver');
    const [serialPort, setSerialPort] = useState<any>(null);

    const isCashPayment = paymentMethod === 'CASH';

    const amountTenderedNum = useMemo(() => parseFloat(amountTendered) || 0, [amountTendered]);
    const change = useMemo(() => amountTenderedNum - totalDue, [amountTenderedNum, totalDue]);

    const handleConnectPrinter = async () => {
        if ('serial' in navigator) {
            try {
                const port = await (navigator as any).serial.requestPort();
                await port.open({ baudRate: 9600 }); // Common baud rate for thermal printers
                setSerialPort(port);
                toast({ title: "Printer Connected", description: "Serial printer connected successfully." });
                setPrintMode('escpos');
            } catch (err: any) {
                 console.error('Error connecting to printer:', err);
                 toast({ title: "Connection Failed", description: "Could not connect to printer.", variant: "destructive" });
            }
        } else {
             toast({ title: "Not Supported", description: "WebSerial is not supported in this browser.", variant: "destructive" });
        }
    };

    const isPrintingRef = useRef(false);

    const handleEscPosPrint = async (saleDetails: any) => {
        if (!serialPort) {
             toast({ title: "No Printer", description: "Please connect a printer first.", variant: "destructive" });
             return;
        }

        // Prevent duplicate prints
        if (isPrintingRef.current) {
            console.log('Print already in progress, skipping...');
            return;
        }

        // Check if writable stream is locked
        if (serialPort.writable?.locked) {
            console.log('Printer stream is locked, waiting...');
            toast({ title: "Printer Busy", description: "Please wait for the current print to complete.", variant: "default" });
            return;
        }

        isPrintingRef.current = true;

        try {
            const { ReceiptGenerator } = await import('@/lib/receipt-generator');
            const generator = new ReceiptGenerator();
            // Ensure amountTendered is present in saleDetails for the generator
            const detailsWithTender = {
                ...saleDetails,
                amountTendered: isCashPayment ? amountTenderedNum : saleDetails.totalDue
            };
            const bytes = generator.generateReceipt(detailsWithTender);

            const writer = serialPort.writable.getWriter();
            try {
                await writer.write(bytes);
            } finally {
                writer.releaseLock();
            }
        } catch (err: any) {
             console.error('Printing error:', err);
             toast({ title: "Print Failed", description: "Failed to send data to printer.", variant: "destructive" });
        } finally {
            isPrintingRef.current = false;
        }
    };

    const handleConfirmPayment = async () => {
        const finalAmountTendered = isCashPayment ? amountTenderedNum : totalDue;

        if (finalAmountTendered < totalDue) {
            toast({
                title: "Insufficient Amount",
                description: "The amount tendered is less than the total due.",
                variant: "destructive",
            });
            return;
        }

        setIsProcessing(true);
        try {
            const response = await fetch('/api/pos/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    items,
                    customer,
                    paymentMethod,
                    totalDue,
                    subtotal: items.reduce((acc, item) => acc + item.price * item.quantity, 0),
                    discountAmount: items.reduce((acc, item) => acc + (item.price * item.quantity * item.discount) / 100, 0),
                    taxAmount: (totalDue / 1.12) * 0.12, // Assuming 12% VAT included
                    userId: currentUser?.uid || currentUser?.id,
                    amountTendered: finalAmountTendered,
                    change: finalAmountTendered - totalDue,
                    shiftId: shiftId, // Use prop
                    terminalId: terminalId
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save transaction');
            }

            console.log('Payment saved to database:', result);

            setCompletedSale({
                items,
                customer,
                totalDue,
                change: finalAmountTendered - totalDue,
                paymentMethod,
                orderNumber: result.data.orderNumber // Capture Order # (Sequential)
            });

            onSuccess(paymentMethod, totalDue); // Clear the cart in the background
            setView('receipt');
        } catch (error: any) {
            console.error('Error saving payment:', error);
            toast({
                title: "Transaction Error",
                description: error.message || "Failed to save the transaction to the database.",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleSmartPrint = () => {
        if (completedSale) {
             if (printMode === 'escpos') {
                 if (serialPort) {
                     handleEscPosPrint(completedSale);
                 } else {
                     toast({ 
                         title: "Printer Not Connected", 
                         description: "Switching to standard print dialog.", 
                         variant: "default" 
                     });
                     printReceipt(completedSale);
                 }
             } else {
                 printReceipt(completedSale);
             }
        }
    };



    // Load print mode preference - DISABLED to focus on Driver Mode as default
    /*
    useEffect(() => {
        const savedMode = localStorage.getItem('pos_print_mode');
        if (savedMode === 'driver' || savedMode === 'escpos') {
            setPrintMode(savedMode);
        }
    }, []);
    */

    // Save print mode preference
    const handleSetPrintMode = (mode: 'driver' | 'escpos') => {
        setPrintMode(mode);
        // localStorage.setItem('pos_print_mode', mode); // Persistance disabled
    };

    useEffect(() => {
        if (isOpen) {
            setView('tender');
            setCompletedSale(null);
            setIsProcessing(false);
            setAmountTendered('');

            if (!isCashPayment && totalDue > 0) {
                handleConfirmPayment();
            }
        }
    }, [isOpen]);

    const handleQuickAmount = (amount: number) => {
        setAmountTendered(amount.toString());
    }

    const handleNewSale = () => {
        onOpenChange(false);
    }

    const getQuickAmounts = (total: number) => {
        const amounts = new Set<number>();
        amounts.add(Math.ceil(total));
        if (total < 50) {
            amounts.add(50);
            amounts.add(100);
        } else if (total < 100) {
            amounts.add(Math.ceil(total / 50) * 50);
            amounts.add(Math.ceil(total / 50) * 50 + 50);
        } else if (total < 1000) {
            amounts.add(Math.ceil(total / 100) * 100);
            amounts.add(Math.ceil(total / 100) * 100 + 100);
        }
        amounts.add(1000);

        return Array.from(amounts).filter(a => a >= total).sort((a, b) => a - b).slice(0, 4);
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                {view === 'receipt' && completedSale ? (
                    <ReceiptView saleDetails={completedSale} onNewSale={handleNewSale} onPrint={handleSmartPrint} />
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Tender Payment via {paymentMethod}</DialogTitle>
                            <DialogDescription>Finalize the transaction.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-6">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">Total Amount Due</p>
                                <p className="text-5xl font-bold text-primary">₱{totalDue.toFixed(2)}</p>
                            </div>

                            {isCashPayment && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="amountTendered" className="text-base">Amount Tendered</Label>
                                        <Input
                                            id="amountTendered"
                                            type="number"
                                            value={amountTendered}
                                            onChange={(e) => setAmountTendered(e.target.value)}
                                            placeholder="0.00"
                                            className="h-12 text-2xl text-right"
                                            autoFocus
                                        />
                                    </div>

                                    {totalDue > 0 && (
                                        <div className="grid grid-cols-4 gap-2">
                                            {getQuickAmounts(totalDue).map(amount => (
                                                <Button key={amount} variant="outline" onClick={() => handleQuickAmount(amount)}>₱{amount}</Button>
                                            ))}
                                        </div>
                                    )}

                                    {amountTenderedNum > 0 && (
                                        <div className="text-center">
                                            <p className="text-sm text-muted-foreground">Change</p>
                                            <p className={`text-4xl font-bold ${change < 0 ? 'text-destructive' : 'text-green-600'}`}>
                                                ₱{change.toFixed(2)}
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}

                            {!isCashPayment && (
                                <div className="flex justify-center items-center flex-col gap-2 p-4 text-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Processing payment...</p>
                                </div>
                            )}
                        </div>
                        {isCashPayment && (
                            <DialogFooter className="flex-col gap-2 sm:flex-row">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                    Cancel
                                </Button>
                                
                                <div className="flex gap-2 items-center">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleSetPrintMode(printMode === 'driver' ? 'escpos' : 'driver')}
                                    >
                                        Mode: {printMode === 'driver' ? 'Driver' : 'ESC/POS'}
                                    </Button>
                                    
                                    {printMode === 'escpos' && !serialPort && (
                                        <Button variant="outline" size="sm" onClick={handleConnectPrinter}>
                                            Connect Printer
                                        </Button>
                                    )}
                                </div>

                                <Button
                                    type="button"
                                    onClick={handleConfirmPayment}
                                    disabled={isProcessing || (isCashPayment && amountTenderedNum < totalDue)}
                                    className="w-48"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        'Confirm Payment'
                                    )}
                                </Button>
                            </DialogFooter>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
