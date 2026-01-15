'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AdminAuthDialog } from './admin-auth-dialog';
import { Separator } from '@/components/ui/separator';

interface XReadingDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

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

function XReadingReportView({ onBack }: { onBack: () => void }) {
    const [xReadingData, setXReadingData] = useState<XReadingData | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        loadXReadingData();
    }, []);

    const loadXReadingData = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/sales/x-reading?shiftStatus=active&limit=1');
            const result = await response.json();
            if (result.success && result.data.length > 0) {
                setXReadingData(result.data[0]);
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

    const handlePrint = () => {
        window.print();
        toast({
            title: "X-Reading Printed",
            description: "Cashier shift report has been printed."
        });
        onBack();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                <span className="ml-2">Loading X-Reading data...</span>
            </div>
        );
    }

    if (!xReadingData) {
        return (
            <div className="text-center p-8">
                <h3 className="text-lg font-semibold mb-2">No Active Cashier Shift</h3>
                <p className="text-muted-foreground mb-4">There is currently no active cashier shift to generate an X-Reading report for.</p>
                <Button onClick={loadXReadingData}>Refresh</Button>
            </div>
        );
    }

    const data = xReadingData;

    return (
        <div className="printable-area">
            <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                    <Button variant="outline" size="icon" onClick={onBack} className="non-printable">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <DialogTitle>X-Reading Report</DialogTitle>
                        <DialogDescription>
                            Cashier Shift Report - {data.cashierName} ({data.terminalId})
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="text-sm text-muted-foreground space-y-1 mb-4">
                    <p>Shift Start: {data.shiftStart ? format(new Date(data.shiftStart), 'PPP p') : 'Not started'}</p>
                    <p>Shift End: {data.shiftEnd ? format(new Date(data.shiftEnd), 'PPP p') : 'In progress'}</p>
                    <p>Report Generated: {format(new Date(data.reportDate), 'PPP p')}</p>
                </div>

                <div className="p-4 border rounded-lg space-y-2">
                    <h3 className="font-semibold text-lg">Sales Summary</h3>
                    <div className="flex justify-between text-sm"><span>Gross Sales:</span> <span>₱{data.grossSales.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span>Returns:</span> <span className="text-destructive">₱{data.returns.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span>Discounts:</span> <span className="text-destructive">₱{data.discounts.toFixed(2)}</span></div>
                    <Separator />
                    <div className="flex justify-between font-bold"><span>Net Sales:</span> <span>₱{data.netSales.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm text-muted-foreground"><span>VAT (12%):</span> <span>₱{data.vatAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm text-muted-foreground"><span>Transaction Count:</span> <span>{data.transactionCount}</span></div>
                </div>

                <div className="p-4 border rounded-lg space-y-2">
                    <h3 className="font-semibold text-lg">Payment Breakdown</h3>
                    {data.paymentMethods.map((method: any) => (
                        <div key={method.name} className="flex justify-between text-sm"><span>{method.name}:</span> <span>₱{method.amount.toFixed(2)}</span></div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-bold"><span>Total Payments:</span> <span>₱{data.paymentMethods.reduce((acc: number, m: any) => acc + m.amount, 0).toFixed(2)}</span></div>
                </div>

                <div className="p-4 border rounded-lg space-y-2">
                    <h3 className="font-semibold text-lg">Cash Summary</h3>
                    <div className="flex justify-between text-sm"><span>Starting Cash:</span> <span>₱{data.startingCash.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span>Cash Sales:</span> <span>₱{data.cashSales.toFixed(2)}</span></div>
                    <Separator />
                    <div className="flex justify-between font-bold"><span>Expected Cash in Drawer:</span> <span>₱{data.cashInDrawer.toFixed(2)}</span></div>
                </div>
            </div>
            <DialogFooter className="non-printable">
                <Button variant="outline" onClick={onBack}>Back</Button>
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print X-Reading
                </Button>
            </DialogFooter>
        </div>
    );
}

export function XReadingDialog({
  isOpen,
  onOpenChange,
}: XReadingDialogProps) {
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setIsAuthDialogOpen(true);
    } else {
        setIsAuthDialogOpen(false);
        setShowReport(false);
    }
  }, [isOpen]);

  const handleAdminAuthSuccess = () => {
    setIsAuthDialogOpen(false);
    setShowReport(true);
  };

  const handleDialogStateChange = (open: boolean) => {
    if (!open) {
        setShowReport(false);
    }
    onOpenChange(open);
  }

  return (
      <Dialog open={isOpen} onOpenChange={handleDialogStateChange}>
        <DialogContent className="sm:max-w-md">
            {showReport ? (
                <XReadingReportView onBack={() => onOpenChange(false)} />
            ) : (
                <AdminAuthDialog
                    isOpen={isAuthDialogOpen}
                    onOpenChange={setIsAuthDialogOpen}
                    onSuccess={handleAdminAuthSuccess}
                />
            )}
            {!showReport && (
                <DialogHeader>
                    <DialogTitle>X-Reading Authorization</DialogTitle>
                    <DialogDescription>
                        Admin password is required to generate the cashier shift report. This action does not reset totals.
                    </DialogDescription>
                </DialogHeader>
            )}
        </DialogContent>
      </Dialog>
  );
}