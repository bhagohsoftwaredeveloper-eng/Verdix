
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

interface ZReadingDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// Mock data for the report
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

function ZReadingReportView({ onBack }: { onBack: () => void }) {
    const data = MOCK_Z_READING_DATA;
    const { toast } = useToast();

    const handlePrintAndFinalize = () => {
        // In a real app, this would also send a signal to the backend to reset totals.
        window.print();
        toast({
            title: "Z-Reading Finalized (Mock)",
            description: "The daily totals have been reset."
        });
        onBack();
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
            <div className="space-y-4 py-4">
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
