import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AdminAuthDialog } from './admin-auth-dialog';
import { XReadingPreview } from '../sales/x-reading/x-reading-preview';

interface XReadingDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  shiftId?: string | null;
  autoShow?: boolean;
}

export function XReadingDialog({
  isOpen,
  onOpenChange,
  shiftId,
  autoShow = false,
}: XReadingDialogProps) {
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [businessSettings, setBusinessSettings] = useState<any>(null);
  const [printerFormat, setPrinterFormat] = useState<'58mm' | '80mm'>('80mm'); // Add printer format state
  const { toast } = useToast();

  useEffect(() => {
    // If autoShow is true (e.g. after ending shift), skip auth
    if (isOpen && autoShow) {
        setShowReport(true);
        loadReportData();
    } else if (isOpen) {
        // Normal manual trigger requires auth
        setIsAuthDialogOpen(true);
        setShowReport(false);
    } else {
        setIsAuthDialogOpen(false);
        setShowReport(false);
        setReportData(null);
    }
  }, [isOpen, autoShow]);

  useEffect(() => {
      // Fetch settings whenever dialog opens
      if (isOpen) {
          fetch('/api/pos-settings')
              .then(res => res.json())
              .then(data => {
                  if (data.success) setBusinessSettings(data.data);
              })
              .catch(err => console.error("Failed to load settings", err));
      }
  }, [isOpen]);

  const loadReportData = async () => {
      setLoading(true);
      try {
          // If shiftId is provided, use it. Otherwise default to active/latest.
          // Note: The original API /api/sales/x-reading accepts query params
          let url = '/api/sales/x-reading?limit=1';
          if (shiftId) {
             // We need to support fetching by ID in the API, or filter client side if API doesn't support it.
             // Looking at API, it supports date range. It doesn't seem to support ID directly in GET params unless we modify it.
             // However, checking the API code again (from memory), it returns a list.
             // Let's modify the API URL request to include the specific ID if possible, or we filter result.
             // Actually, I should update the API to support ?shiftId=... 
             // But for now, let's assume we can filter or catch the right one.
             // If I just ended the shift, it is the latest one.
             // So fetching limit=1 should get the latest valid one if we don't constrain by status=active uniquely.
             // Wait, previous code used `shiftStatus=active`. I should remove that constraint if I want the *just ended* (completed) shift.
             url = `/api/sales/x-reading?limit=1&shiftId=${shiftId}`; 
          } else {
             url = '/api/sales/x-reading?shiftStatus=active&limit=1';
          }
          
          const response = await fetch(url);
          const result = await response.json();
          
          if (result.success && result.data.length > 0) {
              // If we requested a specific ID, find it (in case API ignores param and returns list)
              let data = result.data[0];
              if (shiftId) {
                  const found = result.data.find((d: any) => d.id === shiftId);
                  if (found) data = found;
              }
              setReportData(data);
          } else {
             // Handle case where data might not be ready yet?
          }
      } catch (error) {
          console.error("Error loading X-reading:", error);
          toast({ title: "Error", description: "Failed to load report data", variant: "destructive" });
      } finally {
          setLoading(false);
      }
  };

  const handleAdminAuthSuccess = () => {
    setIsAuthDialogOpen(false);
    setShowReport(true);
    loadReportData();
  };

  const handleDialogStateChange = (open: boolean) => {
    if (!open) {
        setShowReport(false);
    }
    onOpenChange(open);
  }

  const handlePrint = () => {
      // Small delay to ensure render
      setTimeout(() => {
          window.print();
      }, 100);
  };

  return (
      <Dialog open={isOpen} onOpenChange={handleDialogStateChange}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
            {showReport ? (
                <>
                <DialogHeader className="px-4 py-3 border-b flex-none">
                    <DialogTitle>X-READING</DialogTitle>
                    <DialogDescription className="hidden">Report Details</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto bg-gray-50 p-4 flex justify-center">
                     {loading ? (
                        <div className="p-8 text-center">Loading report...</div>
                    ) : reportData ? (
                        <div className="bg-white shadow-sm h-fit printable-area">
                            <XReadingPreview 
                                data={reportData} 
                                printerFormat={printerFormat}
                                businessSettings={businessSettings}
                            />
                        </div>
                    ) : (
                        <div className="p-8 text-center text-sm text-gray-500">
                             <p>No data available.</p>
                             <Button onClick={loadReportData} variant="outline" size="sm" className="mt-2">Retry</Button>
                        </div>
                    )}
                </div>

                <div className="px-4 py-3 border-t bg-gray-50 flex justify-between items-center flex-none">
                     {/* Format Selector matching Sales Page */}
                     <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground hidden sm:inline-block">Format:</span>
                         <Select value={printerFormat} onValueChange={(value) => setPrinterFormat(value as '58mm' | '80mm')}>
                            <SelectTrigger className="h-8 w-[90px] text-xs bg-white">
                                <SelectValue placeholder="Format" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="58mm">58mm</SelectItem>
                                <SelectItem value="80mm">80mm</SelectItem>
                            </SelectContent>
                         </Select>
                     </div>
                     
                     <div className="flex gap-2">
                         <Button variant="outline" onClick={() => handleDialogStateChange(false)} className="bg-white">Close</Button>
                         <Button onClick={handlePrint} disabled={loading || !reportData} className="bg-[#008CCB] hover:bg-[#007cb3] text-white">
                             <Printer className="mr-2 h-4 w-4" /> POS Print
                         </Button>
                     </div>
                </div>
                </>
            ) : (
                <div className="p-6">
                    <DialogHeader className="hidden">
                        <DialogTitle>Authorization</DialogTitle>
                         <DialogDescription>Please authorize</DialogDescription>
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