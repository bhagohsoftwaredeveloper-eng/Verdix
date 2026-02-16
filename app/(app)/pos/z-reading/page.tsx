'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AdminAuthDialog } from '../admin-auth-dialog';
import { ZReadingPreview, ZReadingData } from '../../sales/z-reading/z-reading-preview';

// Mock data for the report - in a real app, this would come from the backend
const MOCK_Z_READING_DATA: ZReadingData = {
    id: 'Z-Mock-001',
    date: new Date().toISOString(),
    reportDate: new Date(),
    grossSales: 8540.50,
    returns: 120.00,
    discounts: 55.25,
    netSales: 8365.25,
    vatSales: 7468.97,
    vatAmount: 896.28,
    vatExempt: 359.43,
    zeroRated: 0.00,
    nonVat: 0.00,
    paymentMethods: [
        { name: 'Cash', amount: 4500.00 },
        { name: 'Credit Card', amount: 2540.50 },
        { name: 'GCash', amount: 1500.00 },
    ],
    transactionCount: 42,
    startingCash: 5000.00,
    cashSales: 4500.00,
    cashInDrawer: 9500.00,
    terminalId: 'Counter 1',
    minSaleId: '0000000000001',
    maxSaleId: '0000000000042',
    previousReading: 154300.00,
    runningTotal: 162665.25
};

// Mock settings
const MOCK_SETTINGS = {
    businessName: "NICOLE'S SUPERMARKET",
    address: 'Ground Floor Jade Bldg., Jennalyn Ave., Brgy. Abogado, Paniqui, Tarlac',
    contactNumber: '09123456789',
    tin: '123-456-789-00000'
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
        <div className="max-w-4xl mx-auto p-6 space-y-6 flex flex-col items-center">
            <div className="bg-white shadow-lg p-4 rounded-lg">
                <ZReadingPreview 
                    data={data} 
                    printerFormat="80mm" 
                    businessSettings={MOCK_SETTINGS} 
                />
            </div>

            <div className="flex justify-center space-x-4 print:hidden">
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
