
import { useState, useEffect, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AdminAuthDialog } from './admin-auth-dialog';
import { XReadingPreview } from '../sales/x-reading/x-reading-preview';
import { BusinessSettings } from '../sales/z-reading/z-reading-preview';
import { XReadingData } from '@/lib/types';
import { usePrinter } from '@/lib/use-printer';
import { XReadingGenerator } from '@/lib/x-reading-generator';
import { getApiUrl } from '@/lib/api-config';

interface XReadingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  shiftId?: string;
  autoShow?: boolean;
  terminalName?: string;
  printMode: 'browser' | 'escpos' | 'usb' | 'native';
}

export function XReadingDialog({
  isOpen,
  onOpenChange,
  shiftId,
  autoShow = false,
  terminalName,
  printMode
}: XReadingDialogProps) {
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<XReadingData | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const { isPrinting, isConnected, connect, print } = usePrinter(printMode);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && autoShow) {
        setShowReport(true);
        loadReportData();
    } else if (isOpen) {
        setIsAuthDialogOpen(true);
        setShowReport(false);
    } else {
        setIsAuthDialogOpen(false);
        setShowReport(false);
        setReportData(null);
    }
  }, [isOpen, autoShow]);

  useEffect(() => {
      if (isOpen) {
          fetch(getApiUrl('/pos-settings'))
              .then(res => res.json())
              .then(data => {
                  if (data.success) {
                      setBusinessSettings(data.data);
                  }
              })
              .catch(err => console.error("Failed to load settings", err));
      }
  }, [isOpen]);

  const loadReportData = async () => {
      setLoading(true);
      try {
          let url = '/sales/x-reading?limit=1';
          if (shiftId) {
             url = `/sales/x-reading?limit=1&shiftId=${shiftId}`; 
          } else {
             url = '/sales/x-reading?shiftStatus=active&limit=1';
          }
          
          const response = await fetch(getApiUrl(url));
          if (!response.ok) throw new Error(`API error ${response.status}`);
          const result = await response.json();
          
          if (result.success && result.data.length > 0) {
              setReportData(result.data[0]);
          }
      } catch (error) {
          console.error("Error loading X-reading:", error);
          toast({ title: "Error", description: "Failed to load report data", variant: "destructive" });
      } finally {
          setLoading(false);
      }
  };

  const handlePrint = async () => {
      if (!reportData) return;

      if (printMode === 'browser') {
          try {
              const { printReactComponent } = await import('@/app/lib/print-utils');
              printReactComponent(
                  <XReadingPreview 
                      data={{ ...reportData, terminalName }} 
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
          const generator = new XReadingGenerator();
          
          // Merge business details into report data for the generator
          const printData = {
              ...reportData,
              businessName: businessSettings?.businessName,
              operatedBy: businessSettings?.operatedBy,
              address: businessSettings?.address,
              tin: businessSettings?.tin,
              vatRegistration: businessSettings?.vatRegistration,
              contactNumber: businessSettings?.contactNumber,
              email: businessSettings?.email,
              terminalName: terminalName,
              min: reportData?.min,
              sn: reportData?.sn
          };

          const bytes = generator.generate(printData as any);
          await print(bytes);
          toast({ title: "Success", description: "X-Reading report sent to printer." });
      } catch (error) {
          console.error("Print error:", error);
          toast({ title: "Print Failed", description: "Failed to send data to printer.", variant: "destructive" });
      }
  };

  const handleAdminAuthSuccess = () => {
    setIsAuthDialogOpen(false);
    setShowReport(true);
    loadReportData();
  };

  return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl h-full overflow-hidden flex flex-col p-0 gap-0 [&>button]:hidden">
            {showReport ? (
                <>
                <SheetHeader className="px-4 py-3 border-b flex-none flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <SheetTitle>X-READING REPORT</SheetTitle>
                    </div>
                    <SheetDescription className="hidden">Report Details</SheetDescription>
                    <Button size="sm" onClick={handlePrint} disabled={loading || isPrinting || !reportData}>
                        {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                        Print
                    </Button>
                </SheetHeader>

                <div className="flex-1 overflow-auto bg-muted/20 p-4 flex justify-center">
                     {loading ? (
                        <div className="p-8 text-center flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Loading report...</p>
                        </div>
                    ) : reportData ? (
                        <div className="bg-white shadow-lg h-fit max-w-[400px] w-full">
                            <XReadingPreview 
                                data={{ ...reportData, terminalName }} 
                                businessSettings={businessSettings}
                            />
                        </div>
                    ) : (
                        <div className="p-8 text-center text-sm text-gray-500">
                             <p>No data available.</p>
                             <Button onClick={loadReportData} variant="outline" size="sm" className="mt-2 text-foreground">Retry</Button>
                        </div>
                    )}
                </div>
                </>
            ) : (
                <div className="p-6">
                    <SheetHeader className="text-left space-y-0.5">
                        <SheetTitle>X-Reading Authorization</SheetTitle>
                         <SheetDescription>Admin password is required to generate the report preview.</SheetDescription>
                    </SheetHeader>
                    <AdminAuthDialog
                        isOpen={isAuthDialogOpen}
                        onOpenChange={setIsAuthDialogOpen}
                        onSuccess={handleAdminAuthSuccess}
                    />
                </div>
            )}
        </SheetContent>
      </Sheet>
  );
}
