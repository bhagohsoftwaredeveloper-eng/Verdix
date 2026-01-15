
'use client';

import { useState, useEffect, useMemo, type ReactNode } from 'react';
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
    onSuccess: (paymentMethod: string, amount: number) => void;
}

function ReceiptView({
    saleDetails,
    onNewSale
}: {
    saleDetails: {
        items: SaleItem[],
        customer: Customer | null,
        totalDue: number,
        change: number,
        paymentMethod: string,
    };
    onNewSale: () => void;
}) {
    const { items, customer, totalDue, change, paymentMethod } = saleDetails;
    const subTotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const totalDiscount = items.reduce((acc, item) => acc + (item.price * item.quantity * item.discount) / 100, 0);
    const vatAmount = (totalDue / 1.12) * 0.12;

    useEffect(() => {
        const timer = setTimeout(() => {
            window.print();
        }, 100);
        return () => clearTimeout(timer);
    }, []);


    return (
        <div className="printable-area">
            <DialogHeader>
                <div className="flex flex-col items-center gap-2">
                    <Logo className="size-8 text-primary" />
                    <DialogTitle className="text-2xl font-bold">StockPilot</DialogTitle>
                </div>
                <DialogDescription className="text-center">
                    Sale Receipt <br />
                    {format(new Date(), 'PPpp')}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 text-sm">
                <p>Customer: {customer?.name || 'Walk-in'}</p>
                <Table className="mt-4">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-center">Qty</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map(item => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="text-center">{item.quantity}</TableCell>
                                <TableCell className="text-right">₱{item.price.toFixed(2)}</TableCell>
                                <TableCell className="text-right">₱{(item.price * item.quantity).toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className="mt-4 space-y-1 border-t pt-4">
                    <div className="flex justify-between"><span>Subtotal:</span> <span>₱{subTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Discount:</span> <span>-₱{totalDiscount.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>VAT (12%):</span> <span>₱{vatAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-lg"><span>Total Due:</span> <span>₱{totalDue.toFixed(2)}</span></div>
                    {paymentMethod === 'CASH' && <div className="flex justify-between font-bold text-xl"><span>Change:</span> <span>₱{change.toFixed(2)}</span></div>}
                </div>
            </div>
            <DialogFooter className="non-printable">
                <Button variant="outline" onClick={onNewSale}>New Sale</Button>
                <Button onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Receipt
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
    onSuccess,
}: TenderDialogProps) {
    const [amountTendered, setAmountTendered] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [view, setView] = useState<'tender' | 'receipt'>('tender');
    const [completedSale, setCompletedSale] = useState<any>(null);
    const { toast } = useToast();

    const isCashPayment = paymentMethod === 'CASH';

    const amountTenderedNum = useMemo(() => parseFloat(amountTendered) || 0, [amountTendered]);
    const change = useMemo(() => amountTenderedNum - totalDue, [amountTenderedNum, totalDue]);

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
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('Mock payment submitted:', {
            totalDue,
            amountTendered: finalAmountTendered,
            change: finalAmountTendered - totalDue,
            paymentMethod,
        });

        setCompletedSale({
            items,
            customer,
            totalDue,
            change: finalAmountTendered - totalDue,
            paymentMethod,
        });

        onSuccess(paymentMethod, totalDue); // Clear the cart in the background
        setView('receipt');
        setIsProcessing(false);
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
                    <ReceiptView saleDetails={completedSale} onNewSale={handleNewSale} />
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
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                    Cancel
                                </Button>
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
