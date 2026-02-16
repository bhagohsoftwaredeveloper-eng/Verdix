
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AdminAuthDialog } from './admin-auth-dialog';
import { ZReadingPreview, BusinessSettings } from '../sales/z-reading/z-reading-preview';
import { ZReadingData } from '@/lib/types';
import { usePrinter } from '@/lib/use-printer';
import { ZReadingGenerator } from '@/lib/z-reading-generator';

function ZReadingReportView({ onBack, printMode }: { onBack: () => void, printMode: 'browser' | 'escpos' | 'usb' }): JSX.Element {
    const [data, setData] = useState<ZReadingData | null>(null);
    const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { isPrinting, isConnected, connect, print } = usePrinter(printMode);
    const { toast } = useToast();
    
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const settingsRes = await fetch('/api/pos-settings');
                const settingsResult = await settingsRes.json();
                if (settingsResult.success) {
                    setBusinessSettings(settingsResult.data);
                }

                const response = await fetch(`/api/sales/z-reading?mode=current`);
                const result = await response.json();

                if (result.success && result.data.length > 0) {
                    setData({
                        ...result.data[0],
                        reportDate: new Date(result.data[0].reportDate)
                    });
                }
            } catch (error) {
                console.error("Error loading Z-Reading:", error);
                toast({
                    title: "Error",
                    description: "Failed to load Z-Reading data.",
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [toast]);

    const handlePrintAndFinalize = async () => {
        if (!data) return;

        if (printMode === 'browser') {
            try {
                const { printReactComponent } = await import('@/app/lib/print-utils');
                printReactComponent(
                    <ZReadingPreview 
                        data={data} 
                        businessSettings={businessSettings || {} as BusinessSettings} 
                        printerFormat="80mm" 
                    />,
                    '80mm'
                );
                return;
            } catch (e) {
                console.error('Browser print error:', e);
                window.print();
                return;
            }
        }

        if (!isConnected) {
             const success = await connect();
             if (!success) return;
        }

        try {
            const generator = new ZReadingGenerator();
            const bytes = generator.generate(data as any);
            await print(bytes);
            
            toast({
                title: "Z-Reading Printed",
                description: "Report sent to printer.",
            });
        } catch (error) {
            console.error("Print error:", error);
            toast({
                title: "Print Failed",
                description: "Could not generate or send report.",
                variant: 'destructive'
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Generating Z-Reading Report...</p>
            </div>
        );
    }

    if (!data) {
        return (
             <div className="flex flex-col items-center justify-center h-[400px] p-6 text-center">
                <p className="text-muted-foreground">No pending sales found for Z-Reading. All transactions might have been finalized already.</p>
                <Button variant="outline" onClick={onBack} className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full max-h-[85vh]">
            <DialogHeader className="px-4 py-3 border-b flex-none flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <DialogTitle>Z-READING REPORT</DialogTitle>
                </div>
                <div className="flex gap-2">
                    {!isConnected && (
                        <Button variant="outline" size="sm" onClick={connect}>
                            Connect Printer
                        </Button>
                    )}
                    <Button size="sm" onClick={handlePrintAndFinalize} disabled={isPrinting}>
                        {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                        Print Z-Reading
                    </Button>
                </div>
            </DialogHeader>

            <div className="flex-1 overflow-auto p-4 bg-muted/20 flex justify-center">
                 <div className="max-w-[400px] w-full shadow-lg bg-white h-fit">
                    <ZReadingPreview data={data} businessSettings={businessSettings} printerFormat="80mm" />
                 </div>
            </div>
        </div>
    );
}

interface ZReadingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  printMode: 'browser' | 'escpos' | 'usb';
}

export function ZReadingDialog({
  isOpen,
  onOpenChange,
  printMode
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

  return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
            {showReport ? (
                <ZReadingReportView onBack={() => onOpenChange(false)} printMode={printMode} />
            ) : (
                <div className="p-6">
                    <DialogHeader>
                        <DialogTitle>Z-Reading Authorization</DialogTitle>
                        <DialogDescription>
                            Admin password is required to generate the final end-of-day report.
                        </DialogDescription>
                    </DialogHeader>
                    <AdminAuthDialog 
                        isOpen={isAuthDialogOpen}
                        onOpenChange={setIsAuthDialogOpen}
                        onSuccess={handleAdminAuthSuccess}
                    />
                </div>
            )}
        </DialogContent>
      </Dialog>
  );
}
