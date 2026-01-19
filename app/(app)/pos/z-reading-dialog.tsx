
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
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AdminAuthDialog } from './admin-auth-dialog';
import { Separator } from '@/components/ui/separator';

interface ZReadingDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

type ZReadingData = {
    id: string;
    date: string;
    reportDate: Date;
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
    cashierName?: string;
    terminalId?: string;
  };

function ZReadingReportView({ onBack }: { onBack: () => void }) {
    const [data, setData] = useState<ZReadingData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const now = new Date();
                const dateStr = format(now, 'yyyy-MM-dd');
                const response = await fetch(`/api/sales/z-reading?startDate=${dateStr}&endDate=${dateStr}`);
                const result = await response.json();

                if (result.success && result.data.length > 0) {
                    setData({
                        ...result.data[0],
                        reportDate: new Date(result.data[0].reportDate)
                    });
                } else {
                    toast({
                        title: "Error",
                        description: "Failed to load Z-Reading data.",
                        variant: "destructive"
                    });
                }
            } catch (error) {
                console.error("Error loading Z-Reading:", error);
                toast({
                    title: "Error",
                    description: "An unexpected error occurred.",
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [toast]);

    const handlePrintAndFinalize = () => {
        // In a real app, this would also send a signal to the backend to reset totals.
        window.print();
        toast({
            title: "Z-Reading Printed",
            description: "The report has been sent to the printer."
        });
        onBack();
    }

    if (isLoading) {
        return (
            <div className="h-[400px] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Generating Z-Reading Report...</p>
            </div>
        );
    }

    if (!data) {
        return (
             <div className="h-[300px] flex flex-col items-center justify-center space-y-4">
                <p className="text-muted-foreground">No data available for today.</p>
                <Button onClick={onBack}>Go Back</Button>
            </div>
        )
    }

    return (
        <div className="printable-area">
            <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                    <Button variant="outline" size="icon" onClick={onBack} className="non-printable">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <DialogTitle>Z-Reading Report</DialogTitle>
                        <DialogDescription>
                            End-of-day sales summary for {format(data.reportDate, 'PPP')}
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="p-4 border rounded-lg space-y-2">
                    <h3 className="font-semibold text-lg">Sales Summary</h3>
                    <div className="flex justify-between text-sm"><span>Gross Sales:</span> <span>₱{data.grossSales.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span>Returns:</span> <span className="text-destructive">₱{data.returns.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span>Discounts:</span> <span className="text-destructive">₱{data.discounts.toFixed(2)}</span></div>
                    <Separator />
                    <div className="flex justify-between font-bold"><span>Net Sales:</span> <span>₱{data.netSales.toFixed(2)}</span></div>
                     <div className="flex justify-between text-sm text-muted-foreground"><span>VAT (12%):</span> <span>₱{data.vatAmount.toFixed(2)}</span></div>
                </div>

                <div className="p-4 border rounded-lg space-y-2">
                    <h3 className="font-semibold text-lg">Payment Breakdown</h3>
                    {data.paymentMethods.map(method => (
                        <div key={method.name} className="flex justify-between text-sm"><span>{method.name}:</span> <span>₱{method.amount.toFixed(2)}</span></div>
                    ))}
                    {data.paymentMethods.length === 0 && <p className="text-sm text-muted-foreground">No payments recorded.</p>}
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
                <Button onClick={handlePrintAndFinalize}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print & Finalize Z-Reading
                </Button>
            </DialogFooter>
        </div>
    );
}

export function ZReadingDialog({
  isOpen,
  onOpenChange,
}: ZReadingDialogProps) {
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
                <ZReadingReportView onBack={() => onOpenChange(false)} />
            ) : (
                <AdminAuthDialog 
                    isOpen={isAuthDialogOpen}
                    onOpenChange={setIsAuthDialogOpen}
                    onSuccess={handleAdminAuthSuccess}
                />
            )}
            {!showReport && (
                <DialogHeader>
                    <DialogTitle>Z-Reading Authorization</DialogTitle>
                    <DialogDescription>
                        Admin password is required to generate the final end-of-day report. This action will reset daily totals.
                    </DialogDescription>
                </DialogHeader>
            )}
        </DialogContent>
      </Dialog>
  );
}
