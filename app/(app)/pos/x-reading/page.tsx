'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AdminAuthDialog } from '../admin-auth-dialog';
import { Separator } from '@/components/ui/separator';

interface XReadingData {
  id: string;
  date: string;
  reportDate: string;
  shiftStart: string | null;
  shiftEnd: string | null;
  grossSales: number;
  returns: number;
  discounts: number;
  netSales: number;
  vatAmount: number;
  paymentMethods: Array<{ name: string; amount: number }>;
  transactionCount: number;
  startingCash: number;
  cashSales: number;
  cashInDrawer: number;
  cashierName: string;
  cashierId: string;
  terminalId: string;
  shiftStatus: string;
}

function XReadingReportView({ data }: { data: XReadingData }) {
    const { toast } = useToast();

    const handlePrint = () => {
        // X-Reading doesn't finalize or reset totals - just prints the intermediate report
        window.print();
        toast({
            title: "X-Reading Printed",
            description: "Cashier shift report has been printed."
        });
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold">X-Reading Report</h1>
                <p className="text-lg text-muted-foreground">
                    Cashier Shift Report - {data.cashierName} ({data.terminalId})
                </p>
                <div className="text-sm text-muted-foreground space-y-1">
                    <p>Shift Start: {data.shiftStart ? format(new Date(data.shiftStart), 'PPP p') : 'Not started'}</p>
                    <p>Shift End: {data.shiftEnd ? format(new Date(data.shiftEnd), 'PPP p') : 'In progress'}</p>
                    <p>Report Generated: {format(new Date(data.reportDate), 'PPP p')}</p>
                </div>
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
                    {data.paymentMethods.map((method: any) => (
                        <div key={method.name} className="flex justify-between text-sm">
                            <span>{method.name}:</span>
                            <span className="font-mono">₱{method.amount.toFixed(2)}</span>
                        </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-bold"><span>Total Payments:</span> <span className="font-mono">₱{data.paymentMethods.reduce((acc: number, m: any) => acc + m.amount, 0).toFixed(2)}</span></div>
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
                    Print X-Reading
                </Button>
            </div>
        </div>
    );
}

export default function XReadingPage() {
    const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [xReadingData, setXReadingData] = useState<XReadingData | null>(null);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Require admin auth when the page loads
        setIsAuthDialogOpen(true);
    }, []);

    const handleAdminAuthSuccess = () => {
        setIsAuthDialogOpen(false);
        setShowReport(true);
        loadXReadingData();
    };

    const loadXReadingData = async () => {
        setLoading(true);
        try {
            // Load the most recent active shift X-reading for the current cashier
            // In a real implementation, you'd get the current cashier from auth context
            const response = await fetch('/api/sales/x-reading?shiftStatus=active&limit=1');
            const result = await response.json();
            if (result.success && result.data.length > 0) {
                setXReadingData(result.data[0]);
            } else {
                // If no active shift, create a new one or show a message
                toast({
                    title: "No Active Shift",
                    description: "There is no active cashier shift to report on.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error loading X-reading data:', error);
            toast({
                title: "Error",
                description: "Failed to load X-reading data.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
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
            {loading ? (
                <div className="min-h-screen bg-background flex items-center justify-center">
                    <div className="flex items-center space-x-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Loading X-Reading data...</span>
                    </div>
                </div>
            ) : xReadingData ? (
                <XReadingReportView data={xReadingData} />
            ) : (
                <div className="min-h-screen bg-background flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <h2 className="text-xl font-semibold">No Active Cashier Shift</h2>
                        <p className="text-muted-foreground">There is currently no active cashier shift to generate an X-Reading report for.</p>
                        <Button onClick={loadXReadingData}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh
                        </Button>
                    </div>
                </div>
            )}
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
