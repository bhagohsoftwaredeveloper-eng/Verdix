'use client';

import { useState, useEffect, useRef } from 'react';
// Card components removed as they are no longer used in the new layout
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, X, Download, Image as ImageIcon, FileText, Printer, Eye } from 'lucide-react';
// DateRange import removed
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ZReadingPreview } from './z-reading-preview';
import { TerminalSelector } from '@/components/TerminalSelector';

import { ZReadingData } from './z-reading-preview';

type PrinterFormat = '58mm' | '80mm';

type BusinessSettings = {
    businessName: string;
    address: string;
    contactNumber: string;
    tin: string;
};

export default function ZReadingPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [terminal, setTerminal] = useState<string>('all');
  const [zReadings, setZReadings] = useState<ZReadingData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [printerFormat, setPrinterFormat] = useState<PrinterFormat>('80mm');
  const [selectedReading, setSelectedReading] = useState<ZReadingData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/pos-settings');
            const result = await response.json();
            if (result.success) {
                setBusinessSettings(result.data);
            }
        } catch (error) {
            console.error('Error fetching POS settings:', error);
        }
    };
    fetchSettings();
  }, []);

  const fetchZReadings = async () => {
    if (!date) {
        toast({
            title: 'Error',
            description: 'Please select a date',
            variant: 'destructive',
        });
        return;
    }

    setIsLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (date) {
        params.append('startDate', format(date, 'yyyy-MM-dd'));
        params.append('endDate', format(date, 'yyyy-MM-dd'));
      }
      if (terminal) {
        params.append('terminalId', terminal);
      }

      const response = await fetch(`/api/sales/z-reading?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setZReadings(result.data);
        if (result.data.length > 0) {
            setSelectedReading(result.data[0]);
            setIsPreviewOpen(true);
        }
      } else {
        console.error('Failed to fetch Z-readings:', result.error);
        setZReadings([]);
      }
    } catch (error) {
      console.error('Error fetching Z-readings:', error);
      setZReadings([]);
      toast({
        title: 'Error',
        description: 'Failed to fetch Z-readings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async (reading: ZReadingData) => {
    try {
      setSelectedReading(reading);
      setIsPreviewOpen(true);
      
      // Wait for the preview to render
      setTimeout(async () => {
        if (previewRef.current) {
          const canvas = await html2canvas(previewRef.current, {
            scale: 2,
            backgroundColor: '#ffffff',
          });
          
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: printerFormat === '58mm' ? 'portrait' : 'portrait',
            unit: 'mm',
            format: printerFormat === '58mm' ? [58, 297] : [80, 297],
          });
          
          const pdfWidth = printerFormat === '58mm' ? 58 : 80;
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`Z-Reading-${reading.id}.pdf`);
          
          // Don't close automatically if viewing through "Show Report", but here we are exporting.
          // Keeping consistent behavior.
          // setIsPreviewOpen(false); 
          toast({
            title: 'Success',
            description: 'Z-Reading exported as PDF',
          });
        }
      }, 500);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Error',
        description: 'Failed to export PDF',
        variant: 'destructive',
      });
      // setIsPreviewOpen(false);
    }
  };

  const handleExportImage = async (reading: ZReadingData) => {
    try {
      setSelectedReading(reading);
      setIsPreviewOpen(true);
      
      // Wait for the preview to render
      setTimeout(async () => {
        if (previewRef.current) {
          const canvas = await html2canvas(previewRef.current, {
            scale: 2,
            backgroundColor: '#ffffff',
          });
          
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `Z-Reading-${reading.id}.png`;
              link.click();
              URL.revokeObjectURL(url);
              
              // setIsPreviewOpen(false);
              toast({
                title: 'Success',
                description: 'Z-Reading exported as image',
              });
            }
          });
        }
      }, 500);
    } catch (error) {
      console.error('Error exporting image:', error);
      toast({
        title: 'Error',
        description: 'Failed to export image',
        variant: 'destructive',
      });
      // setIsPreviewOpen(false);
    }
  };

  const handlePrint = () => {
    if (!selectedReading) return;
    
    setTimeout(() => {
      window.print();
      // Keep preview open after print
    }, 500);
  };

  const handleView = (reading: ZReadingData) => {
    setSelectedReading(reading);
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4 p-1 bg-background rounded-lg">
        <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Date
            </label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "w-[240px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "yyyy-MM-dd") : <span>Pick a date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
        </div>

        <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Terminal
            </label>
            <TerminalSelector 
                terminalId={terminal} 
                onTerminalChange={setTerminal} 
                showAllOption={true}
            />
        </div>

        <Button onClick={fetchZReadings} className="bg-white hover:bg-gray-100 text-black border border-gray-200 shadow-sm">
            Show Report
        </Button>
      </div>
      
        <div className="border-t pt-6">
            {hasSearched ? (
                isLoading ? (
                    <div className="flex items-center justify-center h-24">
                        <div className="text-muted-foreground">Loading Z-readings...</div>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Z-Reading ID</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Terminal</TableHead>
                                <TableHead>Cashier</TableHead>
                                <TableHead className="text-right">Transactions</TableHead>
                                <TableHead className="text-right">Net Sales</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {zReadings.length > 0 ? (
                                zReadings.map((reading) => (
                                    <TableRow key={reading.id}>
                                        <TableCell className="font-medium font-mono">
                                            {reading.id}
                                        </TableCell>
                                        <TableCell>
                                            {format(new Date(reading.date), 'PP')}
                                        </TableCell>
                                        <TableCell>{reading.terminalId || 'N/A'}</TableCell>
                                        <TableCell>{reading.cashierName || 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            {reading.transactionCount}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            ₱{reading.netSales.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleView(reading)}
                                                    title="View"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => { setSelectedReading(reading); handlePrint(); }}
                                                    title="Print"
                                                >
                                                    <Printer className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleExportPDF(reading)}
                                                    title="Export as PDF"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleExportImage(reading)}
                                                    title="Export as Image"
                                                >
                                                    <ImageIcon className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24">
                                        No Z-readings found for the selected date and terminal.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )
            ) : null}
            
        </div>

      {/* Preview Modal */}
      {isPreviewOpen && selectedReading && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl max-h-[90vh] flex flex-col rounded shadow-lg overflow-hidden">
             
             {/* Modal Header */}
             <div className="flex items-center justify-between px-4 py-3 border-b">
                <h2 className="text-lg font-medium text-gray-700">Z-READING</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-gray-700"
                  onClick={() => setIsPreviewOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
             </div>

             {/* Modal Body - Scrollable */}
             <div className="flex-1 overflow-auto bg-gray-50 p-4 flex justify-center">
                <div ref={previewRef} className="bg-white shadow-sm h-fit">
                    <ZReadingPreview 
                        data={selectedReading} 
                        printerFormat={printerFormat} 
                        businessSettings={businessSettings}
                    />
                </div>
             </div>
             
             {/* Modal Footer */}
             <div className="px-4 py-3 border-t bg-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Format:</span>
                    <Select value={printerFormat} onValueChange={(value) => setPrinterFormat(value as PrinterFormat)}>
                        <SelectTrigger className="w-[90px] h-8 text-xs bg-white">
                            <SelectValue placeholder="Format" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="58mm">58mm</SelectItem>
                            <SelectItem value="80mm">80mm</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => setIsPreviewOpen(false)}
                        className="bg-white"
                    >
                        Close
                    </Button>
                    <Button 
                        onClick={handlePrint}
                        className="bg-[#008CCB] hover:bg-[#007cb3] text-white"
                    >
                        POS Print
                    </Button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
