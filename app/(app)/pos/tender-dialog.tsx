
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Printer, User, Star, Info } from 'lucide-react';
import type { SaleItem } from './page';
import type { Customer } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Logo } from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { usePrinter } from '@/lib/use-printer';
import { ReceiptGenerator } from '@/lib/receipt-generator';
import { useReactToPrint } from 'react-to-print';
import { ReceiptView } from './receipt-view';
import { getApiUrl } from '@/lib/api-config';

import { SystemSettings } from '@/lib/types';

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
    terminalMin?: string;
    terminalSerialNumber?: string;
    paymentMethods: { id: string; name: string; isReferenceRequired?: boolean; pointsAmount?: number; currencyEquivalent?: number }[];
    printMode: 'browser' | 'escpos' | 'usb' | 'native';
    settings?: SystemSettings | null;
    onTriggerCustomerSelection?: () => void;
}


// Print-only receipt component is imported
// Wrapper for visible receipt view with actions
function ReceiptActionView({
    saleDetails,
    onNewSale,
    onPrint,
    settings
}: {
    saleDetails: any;
    onNewSale: () => void;
    onPrint: () => void;
    settings?: SystemSettings | null;
}) {
    return (
        <div className="flex flex-col h-full bg-gray-50 p-4">
             <div className="flex-1 overflow-auto flex justify-center">
                <div className="printable-area bg-white shadow-sm my-4 h-fit">
                    <ReceiptView saleDetails={saleDetails} settings={settings} />
                </div>
            </div>
            <div className="mt-4 flex justify-center gap-4 print:hidden">
                 <Button onClick={onPrint} size="lg" className="w-40">
                    <Printer className="mr-2 h-4 w-4" />
                    Reprint
                </Button>
                <Button onClick={onNewSale} size="lg" className="w-40" variant="secondary">
                    New Sale
                </Button>
            </div>
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
    terminalMin,
    terminalSerialNumber,
    paymentMethods = [],
    printMode,
    settings,
    onTriggerCustomerSelection
}: TenderDialogProps) {
    const [selectedMethod, setSelectedMethod] = useState(paymentMethod);
    const [amountTendered, setAmountTendered] = useState('');
    const [referenceInput, setReferenceInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [view, setView] = useState<'tender' | 'receipt' | 'change' | 'print_prompt'>('tender');
    const [completedSale, setCompletedSale] = useState<any>(null);
    const [pointsToRedeemInput, setPointsToRedeemInput] = useState<string>('');
    const { isPrinting, isConnected, connect, print } = usePrinter(printMode);
    const { toast } = useToast();
    const pointsInputRef = useRef<HTMLInputElement>(null);

    const pointsMethod = useMemo(() => {
        return paymentMethods.find(pm => pm.name.toUpperCase() === 'POINTS');
    }, [paymentMethods]);

    const pointsRate = useMemo(() => {
        if (!pointsMethod || !pointsMethod.pointsAmount || !pointsMethod.currencyEquivalent) {
            return 1; // Default 1:1
        }
        return Number(pointsMethod.currencyEquivalent) / Number(pointsMethod.pointsAmount);
    }, [pointsMethod]);

    // Sync local state when prop changes (dialog opens)
    useEffect(() => {
        if (isOpen && paymentMethod) {
            setSelectedMethod(paymentMethod);
        }
    }, [isOpen, paymentMethod]);

    // Sync selectedMethod with paymentMethods options (fixing case mismatch)
    useEffect(() => {
        if (paymentMethods.length > 0 && selectedMethod) {
             const match = paymentMethods.find(p => p.name.toUpperCase() === selectedMethod.toUpperCase());
             if (match && match.name !== selectedMethod) {
                 setSelectedMethod(match.name);
             }
        }
    }, [paymentMethods, selectedMethod]);

    const isCashPayment = selectedMethod?.toUpperCase() === 'CASH';

    // UX: Reset points when opening or switching methods
    // Modified: Use a ref to track what triggered the reset to avoid resetting when totalDue changes while open
    const lastOpenRef = useRef(false);
    const lastMethodRef = useRef(selectedMethod);
    useEffect(() => {
        const justOpened = isOpen && !lastOpenRef.current;
        const methodChanged = selectedMethod !== lastMethodRef.current;

        if (justOpened || methodChanged) {
            if (selectedMethod?.toUpperCase() === 'POINTS') {
                setPointsToRedeemInput('');
                setAmountTendered(totalDue.toFixed(2));
                
                // Auto-focus points input after a short delay
                setTimeout(() => {
                    pointsInputRef.current?.focus();
                }, 100);
            } else {
                setAmountTendered(totalDue.toFixed(2));
                setPointsToRedeemInput('');
            }
        }
        lastOpenRef.current = isOpen;
        lastMethodRef.current = selectedMethod;
    }, [isOpen, totalDue, selectedMethod]);

    const customerPoints = Number((customer as any)?.current_points || (customer as any)?.loyaltyPoints || 0);
    const pointsToRedeemValueRaw = useMemo(() => parseFloat(pointsToRedeemInput) || 0, [pointsToRedeemInput]);
    
    // Capped by BOTH totalDue and actual available points (Strict 1:1)
    const pointsToRedeemValue = useMemo(() => Math.min(pointsToRedeemValueRaw, totalDue, customerPoints), [pointsToRedeemValueRaw, totalDue, customerPoints]);
    
    // The actual points to be deducted (1:1 ratio)
    const pointsToRedeemCount = pointsToRedeemValue;

    const amountTenderedNum = useMemo(() => parseFloat(amountTendered) || 0, [amountTendered]);
    
    const balanceRemaining = useMemo(() => {
        return Math.max(0, totalDue - pointsToRedeemValue);
    }, [totalDue, pointsToRedeemValue]);

    // Sync amountTendered with balanceRemaining when points change
    // Modified: Only auto-sync if amountTendered is empty or was previously exactly equal to the old balance
    const lastBalanceRef = useRef(balanceRemaining);
    useEffect(() => {
        if (selectedMethod?.toUpperCase() === 'POINTS') {
            const isDefaultAmount = amountTendered === '' || parseFloat(amountTendered) === lastBalanceRef.current;
            if (isDefaultAmount) {
                setAmountTendered(balanceRemaining.toFixed(2));
            }
        }
        lastBalanceRef.current = balanceRemaining;
    }, [balanceRemaining, selectedMethod, amountTendered]);

    const change = useMemo(() => {
        return Math.max(0, amountTenderedNum - balanceRemaining);
    }, [amountTenderedNum, balanceRemaining]);

    const isReferenceRequired = useMemo(() => {
        if (!selectedMethod) return false;
        if (selectedMethod.toUpperCase() === 'CASH') return false; // Never require for cash
        const method = paymentMethods.find(pm => pm.name === selectedMethod);
        return method?.isReferenceRequired || false;
    }, [selectedMethod, paymentMethods]);




    const receiptRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `Receipt-${new Date().getTime()}`,
        onAfterPrint: () => console.log('Print finished'),
        pageStyle: `
            @page {
                size: 58mm auto;
                margin: 0;
            }
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                }
            }
        `
    });

    const handlePrintReceipt = async (dataToPrint?: any) => {
         const details = dataToPrint || completedSale;
         if (!details) return;

         if (printMode === 'browser') {
             // We need to ensure state is set before printing if passed explicitly
             if (dataToPrint && dataToPrint !== completedSale) {
                 setCompletedSale(dataToPrint);
                 // Allow a small tick for ref to update with new data
                 setTimeout(() => {
                     handlePrint();
                 }, 100);
             } else {
                 handlePrint();
             }
             return;
         }

         if (!isConnected) {
             const connected = await connect();
             if (!connected) return;
         }

         try {
             const { ReceiptGenerator } = await import('@/lib/receipt-generator');
             const generator = new ReceiptGenerator();
             // Pass settings to native generator to allow printing of business name/TIN
             const bytes = generator.generateReceipt(details, settings);
             await print(bytes);
         } catch (e) {
             console.error("Printing error", e);
             toast({
                 title: "Print Failed",
                 description: "Could not send data to printer.",
                 variant: "destructive"
             });
         }
    };


    const handleConfirmPayment = async () => {
        
        // Strict Point Validation
        const availablePoints = (customer as any)?.current_points || (customer as any)?.loyaltyPoints || 0;
        
        if (selectedMethod === 'POINTS') {
            if (amountTenderedNum < balanceRemaining) {
                toast({
                    title: "Insufficient Cash",
                    description: `Remaining balance is ₱${balanceRemaining.toFixed(2)}. Please enter enough cash.`,
                    variant: "destructive"
                });
                return;
            }
        }

        if (pointsToRedeemValue > (Number(availablePoints) * pointsRate)) {
            toast({
                title: "Insufficient Points",
                description: `Customer only has ${Number(availablePoints).toFixed(0)} points.`,
                variant: "destructive"
            });
            return;
        }

        const finalAmountTendered = isCashPayment ? amountTenderedNum : balanceRemaining;

        if (isCashPayment && finalAmountTendered < totalDue) {
             toast({
                title: "Insufficient Amount",
                description: "Amount tendered must be greater than or equal to total due.",
                variant: 'destructive'
            });
            return;
        }

        if (isReferenceRequired && !referenceInput.trim()) {
             toast({
                title: "Reference Required",
                description: "Please enter a reference number for this payment method.",
                variant: 'destructive'
            });
            return;
        }

        setIsProcessing(true);
        // toast({ title: "Processing...", description: "Sending transaction to server." }); 

        try {
            const response = await fetch(getApiUrl('/pos/checkout'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transactionDate: new Date(), // Use server time preferably, but this is for reference
                    totalDue: totalDue,
                    subtotal: items.reduce((acc, item) => acc + (item.price * item.quantity), 0),
                    discountAmount: items.reduce((acc, item) => acc + (item.price * item.quantity * ((item.discount || 0) / 100)), 0),
                    taxAmount: items.reduce((acc, item) => {
                        const netItemTotal = item.price * item.quantity * (1 - (item.discount || 0) / 100);
                        const taxType = item.taxType || 'VAT';
                        if (taxType === 'VAT') {
                            return acc + (netItemTotal - (netItemTotal / 1.12));
                        }
                        return acc;
                    }, 0),
                    amountTendered: selectedMethod === 'POINTS' ? (pointsToRedeemValue + amountTenderedNum) : finalAmountTendered,
                    change: selectedMethod === 'POINTS' ? (amountTenderedNum - balanceRemaining) : (finalAmountTendered - totalDue),
                    paymentMethod: selectedMethod === 'POINTS' && balanceRemaining > 0 ? 'POINTS + CASH' : selectedMethod, 
                    items: items.map(item => ({
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        discount: item.discount,
                        cost: item.cost 
                    })),
                    customer: customer || { id: 'walk-in', name: 'Walk-in Customer' },
                    status: 'completed',
                    paymentDetails: {
                        pointsUsed: pointsToRedeemCount, 
                        pointsConversionRate: pointsRate,
                        gatewayReference: isReferenceRequired ? referenceInput : undefined
                    },
                    currentUser: { ...currentUser, id: currentUser?.id || 'admin' }, // Ensure ID exists
                    userId: currentUser?.id || currentUser?.uid || 'admin',
                    shiftId,
                    terminalId
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save transaction');
            }

            // Success feedback
            toast({ 
                title: "Payment Successful", 
                description: "Transaction saved. Printing receipt...",
                duration: 2000
            });

            const saleDetails = {
                items: [...items],
                customer: customer || { id: 'walk-in', name: 'Walk-in' } as any,
                totalDue,
                change,
                paymentMethod: selectedMethod,
                orderNumber: result.data.orderNumber.toString(),
                amountTendered: amountTendered !== '' ? Number(amountTendered) : totalDue,
                transactionDate: new Date(),
                cashierName: currentUser?.display_name || currentUser?.username || 'Admin',
                pointsEarned: result.data.pointsEarned,
                pointsUsedCount: pointsToRedeemCount,
                pointsUsedValue: pointsToRedeemValue,
                pointsBalance: result.data.pointsRemaining,
                terminalMin: terminalMin || settings?.minNumber,
                terminalSerialNumber: terminalSerialNumber || settings?.serialNumber
            };

            console.log('Final Sale Details for Receipt:', saleDetails);
            console.log('Points Earned from API:', result.data.pointsEarned);

            setCompletedSale(saleDetails);


            // Auto-print logic moved or handled here based on flow
            
            // If Change > 0, show Change View, do NOT close/print yet (unless we want to background print)
            // User requested: Enter Amount -> Dialog Change -> Print
            if (change > 0) {
                 setView('change');
                 // We don't print or close yet. We wait for user interaction in Change View.
            } else {
                 // Standard flow for non-cash or exact cash
                 // Transition to Print Prompt instead of auto-printing
                 setView('print_prompt');
            }

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


    const handleCompleteChange = async () => {
        if (!completedSale) return;

        // Transition to Print Prompt after showing change
        setView('print_prompt');
    }

    const handleConfirmPrint = async (shouldPrint: boolean) => {
        if (!completedSale) return;

        if (shouldPrint) {
            await handlePrintReceipt(completedSale);
            // Small delay to ensure print command is sent
            setTimeout(() => {
                onSuccess(selectedMethod, totalDue);
                onOpenChange(false);
            }, 500);
        } else {
            onSuccess(selectedMethod, totalDue);
            onOpenChange(false);
        }
    };
    
    const handleSmartPrint = () => {
        if (completedSale) {
             handlePrintReceipt(completedSale);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setView('tender');
            setCompletedSale(null);
            setIsProcessing(false);
            setPointsToRedeemInput(''); 
            setAmountTendered(totalDue.toFixed(2));
            setReferenceInput('');
            // Auto-confirm removed to allow amount entry for all methods
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

    const amountTenderedFloat = parseFloat(amountTendered) || 0;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
                {view === 'receipt' && completedSale ? (
                    <ReceiptActionView saleDetails={completedSale} onNewSale={handleNewSale} onPrint={handleSmartPrint} settings={settings} />
                ) : view === 'change' && completedSale ? (
                    <div className="flex flex-col items-center justify-center p-6 space-y-8 animate-in zoom-in-95 duration-200">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold uppercase tracking-widest text-muted-foreground">Change Due</h2>
                            <div className="text-7xl font-black text-primary tabular-nums tracking-tight">
                                ₱{completedSale.change.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        
                        <div className="w-full">
                                <Button size="lg" className="w-full h-16 text-xl font-bold" onClick={handleCompleteChange} autoFocus>
                                    Next
                                </Button>
                        </div>
                    </div>
                ) : view === 'print_prompt' && completedSale ? (
                    <div className="flex flex-col items-center justify-center p-6 space-y-8 animate-in zoom-in-95 duration-200">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold uppercase tracking-widest text-muted-foreground">Print Receipt?</h2>
                            <p className="text-muted-foreground">Would you like to print a receipt for this transaction?</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 w-full">
                            <Button 
                                variant="outline" 
                                size="lg" 
                                className="h-16 text-xl font-bold" 
                                onClick={() => handleConfirmPrint(false)}
                            >
                                No
                            </Button>
                            <Button 
                                size="lg" 
                                className="h-16 text-xl font-bold" 
                                onClick={() => handleConfirmPrint(true)}
                                autoFocus
                            >
                                <Printer className="mr-2 h-6 w-6" />
                                Yes
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Tender Payment</DialogTitle>
                            <DialogDescription>Finalize the transaction.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-6">
                            {/* Payment Method Selector */}
                            <div className="space-y-2">
                                <Label htmlFor="paymentMethod" className="text-base">Payment Method</Label>
                                <Select 
                                    value={selectedMethod} 
                                    onValueChange={setSelectedMethod}
                                >
                                    <SelectTrigger className="w-full h-10">
                                        <SelectValue placeholder="Select Payment Method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {paymentMethods.map((method) => (
                                            <SelectItem key={method.id} value={method.name}>
                                                {method.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Manual Points Input field when method is POINTS - MOVED TO TOP */}
                            {selectedMethod === 'POINTS' && (
                                <div className="space-y-4">
                                    {(!customer || (customer as any).id === 'walk-in') ? (
                                        <div className="bg-purple-50 p-6 rounded-xl border-2 border-dashed border-purple-200 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="p-3 bg-white rounded-full shadow-sm text-purple-600">
                                                <User className="h-6 w-6" />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-bold text-purple-900">Points Redemption requires a Customer</p>
                                                <p className="text-sm text-purple-600/70">Please select a customer to see available points.</p>
                                            </div>
                                            <Button 
                                                onClick={onTriggerCustomerSelection}
                                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 shadow-lg shadow-purple-200"
                                            >
                                                Select Customer
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 bg-purple-50 p-4 rounded-xl border border-purple-200 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="flex justify-between items-center px-1">
                                                <Label htmlFor="manualPoints" className="text-purple-900 font-bold text-base flex items-center gap-2">
                                                    <Star className="h-4 w-4 text-purple-600 fill-purple-600" />
                                                    Points Value to Redeem
                                                </Label>
                                                <span className="text-[10px] font-bold text-purple-600 bg-white px-2 py-0.5 rounded-full border border-purple-100 shadow-sm">
                                                    Available: {customerPoints.toLocaleString()} (₱{customerPoints.toFixed(2)})
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <Input
                                                        id="manualPoints"
                                                        ref={pointsInputRef}
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={pointsToRedeemInput}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                                setPointsToRedeemInput(val);
                                                            }
                                                        }}
                                                        placeholder="0"
                                                        className="h-12 text-xl font-bold border-purple-300 focus-visible:ring-purple-500 bg-white pl-4"
                                                    />
                                                </div>
                                                <Button 
                                                    variant="secondary"
                                                    className="bg-purple-600 text-white hover:bg-purple-700 h-12 px-6 font-bold shadow-md shadow-purple-100 transition-all active:scale-95"
                                                    onClick={() => {
                                                        const maxPossibleValue = Math.min(totalDue, customerPoints);
                                                        setPointsToRedeemInput(maxPossibleValue.toFixed(2));
                                                    }}
                                                >
                                                    Redeem All
                                                </Button>
                                            </div>
                                            <p className="text-[10px] text-purple-600 font-bold px-1 flex items-center gap-1">
                                                <Info className="h-3 w-3" />
                                                1 Point = ₱1.00 (Strict 1:1)
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Payment Summary Box */}
                            <div className="space-y-4">
                                <div className="text-center p-6 bg-primary/5 rounded-2xl border-2 border-primary/10 mb-2">
                                    <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Due</p>
                                    <p className="text-5xl font-black text-primary">₱{totalDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    
                                    {pointsToRedeemValue > 0 && (
                                        <div className="mt-4 pt-4 border-t border-primary/10 text-sm space-y-2 animate-in fade-in duration-300">
                                            <div className="flex justify-between items-center text-foreground font-black text-lg">
                                                <span>Net Balance Due:</span>
                                                <span>₱{balanceRemaining.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Amount Tendered Section - Always show for Points and Cash */}
                            {(selectedMethod === 'CASH' || selectedMethod === 'POINTS' || balanceRemaining > 0) && (
                                <div className="space-y-2">
                                    <Label htmlFor="amountTendered" className="text-base font-bold">
                                        {selectedMethod === 'POINTS' ? 'Cash Balance Tendered' : 'Amount Tendered'}
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="amountTendered"
                                            type="text"
                                            inputMode="decimal"
                                            value={amountTendered}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                                    setAmountTendered(value);
                                                }
                                            }}
                                            placeholder="0.00"
                                            className="h-14 text-3xl text-right font-black text-foreground [&:not(:placeholder-shown)]:text-foreground pr-4 border-2 focus-visible:ring-primary/30"
                                            style={{ color: 'hsl(var(--foreground))' }}
                                            autoFocus={selectedMethod !== 'POINTS'}
                                            onFocus={(e) => e.target.select()}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (!isProcessing) {
                                                        handleConfirmPayment();
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                    {selectedMethod === 'POINTS' && balanceRemaining > 0 && (
                                        <p className="text-xs text-right text-muted-foreground mt-1 font-medium italic">
                                            Please enter the cash amount given by the customer for the remaining balance.
                                        </p>
                                    )}
                                </div>
                            )}


                            {/* Reference Input */}
                            {isReferenceRequired && (
                                <div className="space-y-2">
                                    <Label htmlFor="referenceInput" className="text-base text-red-600 font-bold">
                                        Reference Number *
                                    </Label>
                                    <Input
                                        id="referenceInput"
                                        type="text"
                                        value={referenceInput}
                                        onChange={(e) => setReferenceInput(e.target.value)}
                                        placeholder="Enter reference # (e.g. Check No., Trans ID)"
                                        className="h-12 text-lg"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleConfirmPayment();
                                            }
                                        }}
                                    />
                                </div>
                            )}


                            {totalDue > 0 && selectedMethod === 'CASH' && (
                                <div className="grid grid-cols-4 gap-2">
                                    {getQuickAmounts(balanceRemaining || totalDue).map(amount => (
                                        <Button key={amount} variant="outline" onClick={() => handleQuickAmount(amount)} className="h-10 font-bold">₱{amount}</Button>
                                    ))}
                                </div>
                            )}

                            {/* Split Payment Removed - Integrated into main manual flow */}

                            <DialogFooter className="mt-6 sm:justify-between gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    disabled={isProcessing}
                                    className="w-full sm:w-auto text-muted-foreground hover:text-foreground"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={handleConfirmPayment}
                                    disabled={
                                        isProcessing || 
                                        (!amountTendered && balanceRemaining > 0) || 
                                        ((selectedMethod === 'CASH' || selectedMethod === 'POINTS') && parseFloat(amountTendered) < balanceRemaining) ||
                                        (pointsToRedeemValue > (Number((customer as any)?.current_points || (customer as any)?.loyaltyPoints || 0) * pointsRate)) ||
                                        (isReferenceRequired && !referenceInput.trim())
                                    }
                                    className="w-full sm:w-auto min-w-[140px] font-bold text-lg h-12 shadow-md shadow-primary/20"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            Confirm Payment
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </div>
                    </>
                )}
                {/* Hidden Receipt for Printing - using absolute positioning instead of display:none to ensure it renders for print */}
                <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
                    {completedSale && <ReceiptView ref={receiptRef} saleDetails={completedSale} settings={settings} />}
                </div>
            </DialogContent>
        </Dialog>
    );
};
