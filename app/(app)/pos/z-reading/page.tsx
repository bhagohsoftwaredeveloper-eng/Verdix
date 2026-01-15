'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AdminAuthDialog } from '../admin-auth-dialog';
import { Separator } from '@/components/ui/separator';

// Mock data for the report - in a real app, this would come from the backend
const MOCK_Z_READING_DATA = {
    reportDate: new Date(),
    grossSales: 8540.50,
    returns: -120.00,
    discounts: -55.25,
    netSales: 8365.25,
    vatAmount: 896.28,
    paymentMethods: [
        { name: 'Cash', amount: 4500.00 },
        { name: 'Credit Card', amount: 2540.50 },
        { name: 'GCash', amount: 1500.00 },
    ],
    transactionCount: 42,
    startingCash: 5000.00,
    cashSales: 4500.00,
    cashInDrawer: 9500.00,
};

function ZReadingReportView({ onPrint }: { onPrint?: () => void }) {
    const data = MOCK_Z_READING_DATA;
    const { toast } = useToast();

    const handlePrint = () => {
        // In a real app, this would also send a signal to the backend to reset totals.
        window.print();
        if (onPrint) onPrint();
        toast({
            title: "Z-Reading Finalized (Mock)",
            description: "The daily totals have been reset."
        });
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold">Z-Reading Report</h1>
                <p className="text-lg text-muted-foreground">
                    End-of-day sales summary for {format(data.reportDate, 'PPP')}
                </p>
            </div>

            <div className="space-y-4">
                <div className="p-6 border rounded-lg space-y-4">
                    <h2 className="font-semibold text-xl">Sales Summary</h2>
                    <div className="flex justify-between text-sm"><span>Gross Sales:</span> <span className="font-mono">₱{data.grossSales.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm text-destructive"><span>Returns:</span> <span className="font-mono">₱{data.returns.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm text-destructive"><span>Discounts:</span> <span className="font-mono">₱{data.discounts.toFixed(2)}</span></div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg"><span>Net Sales:</span> <span className="font-mono">₱{data.netSales.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm text-muted-foreground"><span>VAT (12%):</span> <span className="font-mono">₱{data.vatAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm text-muted-foreground"><span>Transaction Count:</span> <span className="font-mono">{data.transactionCount}</span></div>
                </div>

                <div className="p-6 border rounded-lg space-y-4">
                    <h2 className="font-semibold text-xl">Payment Breakdown</h2>
                    {data.paymentMethods.map(method => (
                        <div key={method.name} className="flex justify-between text-sm">
                            <span>{method.name}:</span>
                            <span className="font-mono">₱{method.amount.toFixed(2)}</span>
                        </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-bold"><span>Total Payments:</span> <span className="font-mono">₱{data.paymentMethods.reduce((acc, m) => acc + m.amount, 0).toFixed(2)}</span></div>
                </div>

                 <div className="p-6 border rounded-lg space-y-4">
                    <h2 className="font-semibold text-xl">Cash Summary</h2>
                    <div className="flex justify-between text-sm"><span>Starting Cash:</span> <span className="font-mono">₱{data.startingCash.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span>Cash Sales:</span> <span className="font-mono">₱{data.cashSales.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span>Cash Received (-) / Paid (+):</span> <span className="font-mono">₱0.00</span></div>
                    <Separator />
                    <div className="flex justify-between font-bold"><span>Expected Cash in Drawer:</span> <span className="font-mono">₱{data.cashInDrawer.toFixed(2)}</span></div>
                </div>
            </div>

            <div className="flex justify-center space-x-4">
                <Button size="lg" onClick={handlePrint}>
                    <Printer className="mr-2 h-5 w-5" />
                    Print Z-Reading & Finalize Shift
                </Button>
            </div>
        </div>
    );
}

export default function ZReadingPage() {
    const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
    const [showReport, setShowReport] = useState(false);

    useEffect(() => {
        // Require admin auth when the page loads
        setIsAuthDialogOpen(true);
    }, []);

    const handleAdminAuthSuccess = () => {
        setIsAuthDialogOpen(false);
        setShowReport(true);
    };

    if (!showReport) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <AdminAuthDialog
                    isOpen={isAuthDialogOpen}
                    onOpenChange={setIsAuthDialogOpen}
                    onSuccess={handleAdminAuthSuccess}
                />
            </div>
        );
    }

    return (
        <>
            <ZReadingReportView />
            <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
                <AdminAuthDialog
                    isOpen={isAuthDialogOpen}
                    onOpenChange={setIsAuthDialogOpen}
                    onSuccess={handleAdminAuthSuccess}
                />
            </Dialog>
        </>
    );
}
