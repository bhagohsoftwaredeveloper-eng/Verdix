'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AdminAuthDialog } from '../admin-auth-dialog';
import { ZReadingPreview, ZReadingData } from '../../sales/z-reading/z-reading-preview';
import { usePrinter } from '@/lib/use-printer';
import { getApiUrl } from '@/lib/api-config';

type BusinessSettings = {
    businessName: string;
    address: string;
    contactNumber: string;
    tin: string;
};

function ZReadingReportView({ onPrint }: { onPrint?: () => void }) {
    const { toast } = useToast();
    const { print, isConnected, connect } = usePrinter('native');

    const [data, setData] = useState<ZReadingData | null>(null);
    const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch real Z-Reading data and business settings on mount
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch business settings
                const settingsRes = await fetch(getApiUrl('/pos-settings'));
                const settingsResult = await settingsRes.json();
                if (settingsResult.success) {
                    setBusinessSettings(settingsResult.data);
                }

                // Fetch current Z-Reading data (live, from DB)
                const zRes = await fetch(getApiUrl('/sales/z-reading?mode=current'));
                const zResult = await zRes.json();
                if (zResult.success && zResult.data?.length > 0) {
                    setData(zResult.data[0]);
                } else {
                    toast({
                        title: 'No Data',
                        description: 'No Z-Reading data found for the current period.',
                        variant: 'destructive',
                    });
                }
            } catch (e) {
                console.error('[Z-Reading] Failed to fetch data:', e);
                toast({
                    title: 'Error',
                    description: 'Failed to load Z-Reading data.',
                    variant: 'destructive',
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const handlePrint = async () => {
        if (!data) return;

        let printSuccess = false;

        // Try native ESC/POS print first
        let printerConnected = isConnected;
        if (!printerConnected) {
            printerConnected = await connect();
        }

        if (printerConnected) {
            try {
                const { ReceiptGenerator } = await import('@/lib/receipt-generator');
                const generator = new ReceiptGenerator();
                const bytes = generator.generateZReadingReceipt(data, businessSettings);
                printSuccess = await print(bytes);
            } catch (e) {
                console.error('[Z-Reading] Native print error:', e);
            }
        }

        // Fallback to browser/Electron print (prints the HTML preview directly)
        if (!printSuccess) {
            window.print();
        }

        if (onPrint) onPrint();
        toast({
            title: 'Z-Reading Finalized',
            description: 'The daily totals have been reset.',
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Loading Z-Reading data...</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">No Z-Reading data available.</div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6 flex flex-col items-center">
            {/* 58mm paper width ≈ 220px at screen resolution */}
            <div style={{ width: '220px' }} className="bg-white shadow-lg p-2 rounded-lg">
                <ZReadingPreview
                    data={data}
                    printerFormat="58mm"
                    businessSettings={businessSettings}
                />
            </div>

            <div className="flex justify-center space-x-4 print:hidden">
                <Button size="lg" onClick={handlePrint}>
                    <Printer className="mr-2 h-5 w-5" />
                    Print Z-Reading &amp; Finalize Shift
                </Button>
            </div>
        </div>
    );
}

export default function ZReadingPage() {
    const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
    const [showReport, setShowReport] = useState(false);

    useEffect(() => {
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
