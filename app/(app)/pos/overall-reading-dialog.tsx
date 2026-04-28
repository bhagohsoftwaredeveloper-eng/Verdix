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
import { Printer, Loader2, X, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OverallReadingPreview, OverallReadingData } from '../sales/overall-reading/overall-reading-preview';
import { getApiUrl } from '@/lib/api-config';
import { usePrinter } from '@/lib/use-printer';
import { OverallReadingGenerator } from '@/lib/overall-reading-generator';

interface OverallReadingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  terminalId: string;
  terminalName?: string;
  printMode: 'browser' | 'escpos' | 'usb' | 'native';
}

export function OverallReadingDialog({
  isOpen,
  onOpenChange,
  terminalId,
  terminalName,
  printMode
}: OverallReadingDialogProps) {
  const [reportData, setReportData] = useState<OverallReadingData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isPrinting, isConnected, connect, print } = usePrinter(printMode);

  useEffect(() => {
    if (isOpen) {
        loadReportData();
    } else {
        setReportData(null);
    }
  }, [isOpen, terminalId]);

  const loadReportData = async () => {
      if (!terminalId) return;
      setLoading(true);
      try {
          const response = await fetch(getApiUrl(`/sales/overall-reading?terminalId=${terminalId}`));
          const result = await response.json();
          
          if (result.success) {
              setReportData(result.data);
          } else {
              toast({ title: "Error", description: result.error || "Failed to load report data", variant: "destructive" });
          }
      } catch (error) {
          console.error("Error loading overall reading:", error);
          toast({ title: "Error", description: "Failed to connect to server", variant: "destructive" });
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
                  <OverallReadingPreview 
                      data={reportData} 
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
          const generator = new OverallReadingGenerator();
          const bytes = generator.generate(reportData);
          await print(bytes);
          toast({ title: "Success", description: "Overall Reading report sent to printer." });
      } catch (error) {
          console.error("Print error:", error);
          toast({ title: "Print Failed", description: "Failed to send data to printer.", variant: "destructive" });
      }
  };

  return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
            <DialogHeader className="px-4 py-3 border-b flex-none flex flex-row items-center justify-between">
                <DialogTitle>OVERALL TERMINAL READING</DialogTitle>
                <div className="flex gap-2 mr-6">
                     <Button variant="ghost" size="icon" onClick={loadReportData} disabled={loading} className="h-8 w-8">
                         <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                     </Button>
                     <Button size="sm" onClick={handlePrint} disabled={loading || isPrinting || !reportData} className="bg-primary text-white">
                         {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                         Print
                     </Button>
                </div>
            </DialogHeader>

            <div className="flex-1 overflow-auto bg-muted/20 p-4 flex justify-center">
                 {loading ? (
                    <div className="p-8 text-center flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Generating overall reading...</p>
                    </div>
                ) : reportData ? (
                    <div className="bg-white shadow-lg h-fit max-w-[400px] w-full">
                        <OverallReadingPreview 
                            data={reportData} 
                            printerFormat="80mm"
                        />
                    </div>
                ) : (
                    <div className="p-8 text-center text-sm text-gray-500">
                         <p>No data available for this terminal since last Z-reading.</p>
                         <Button onClick={loadReportData} variant="outline" size="sm" className="mt-4">Retry</Button>
                    </div>
                )}
            </div>
            
            <div className="p-3 border-t bg-background flex justify-end">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
        </DialogContent>
      </Dialog>
  );
}
