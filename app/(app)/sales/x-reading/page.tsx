'use client';

import { useState, useEffect, useRef } from 'react';
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
import { CalendarIcon, X, Image as ImageIcon, FileText, Printer, Eye } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useReactToPrint } from 'react-to-print';
import { getApiUrl } from '@/lib/api-config';
import { XReadingPreview, XReadingData } from './x-reading-preview';
import { BusinessSettings } from '../z-reading/z-reading-preview';

type PrinterFormat = '58mm' | '80mm';

export default function XReadingPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [xReadings, setXReadings] = useState<XReadingData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [printerFormat, setPrinterFormat] = useState<PrinterFormat>('80mm');
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [selectedReading, setSelectedReading] = useState<XReadingData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
        try {
            const response = await fetch(getApiUrl('/pos-settings'));
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

  // ... (existing code)

  const uniqueCashiers = Array.from(new Set(xReadings.map(r => r.cashierName).filter(Boolean))) as string[];

  const filteredReadings = xReadings.filter(reading => 
    selectedCashier === 'all' || reading.cashierName === selectedCashier
  );

  const fetchXReadings = async () => {
    if (!dateRange?.from) {
        toast({
            title: 'Error',
            description: 'Please select a date range',
            variant: 'destructive',
        });
        return;
    }

    setIsLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (dateRange?.from) {
        params.append('startDate', format(dateRange.from, 'yyyy-MM-dd'));
      }
      if (dateRange?.to) {
        params.append('endDate', format(dateRange.to, 'yyyy-MM-dd'));
      } else if (dateRange?.from) {
        params.append('endDate', format(dateRange.from, 'yyyy-MM-dd'));
      }

      // Fetch all shifts for the date range
      const response = await fetch(getApiUrl(`/sales/x-reading?${params.toString()}`));
      const result = await response.json();

      if (result.success) {
        setXReadings(result.data);
      } else {
        console.error('Failed to fetch X-readings:', result.error);
        setXReadings([]);
      }
    } catch (error) {
      console.error('Error fetching X-readings:', error);
      setXReadings([]);
      toast({
        title: 'Error',
        description: 'Failed to fetch X-readings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async (reading: XReadingData) => {
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
          pdf.save(`X-Reading-${reading.id}.pdf`);
          
          toast({
            title: 'Success',
            description: 'X-Reading exported as PDF',
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
    }
  };

  const handleExportImage = async (reading: XReadingData) => {
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
              link.download = `X-Reading-${reading.id}.png`;
              link.click();
              URL.revokeObjectURL(url);
              
              toast({
                title: 'Success',
                description: 'X-Reading exported as image',
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
    }
  };

  const handleReactToPrintFn = useReactToPrint({
    contentRef: previewRef,
    documentTitle: 'X-Reading-Report',
    pageStyle: `
        @page {
            size: ${printerFormat === '58mm' ? '58mm' : '80mm'} auto;
            margin: 0;
        }
        @media print {
            body {
                visibility: visible !important;
                -webkit-print-color-adjust: exact;
            }
            * {
                visibility: visible !important;
            }
        }
    `,
  });

  const handlePrint = (reading?: XReadingData) => {
    if (reading) {
      setSelectedReading(reading);
      setIsPreviewOpen(true);
      // Wait for modal transition and render
      setTimeout(() => {
        handleReactToPrintFn();
      }, 500);
    } else if (selectedReading) {
      handleReactToPrintFn();
    }
  };

  const handleView = (reading: XReadingData) => {
    setSelectedReading(reading);
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4 p-1 bg-background rounded-lg">
        {/* Date Picker */}
        <div className="flex items-center gap-3">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Date
            </label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "w-[300px] justify-start text-left font-normal",
                            !dateRange && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                            dateRange.to ? (
                                <>{format(dateRange.from, "yyyy-MM-dd")} - {format(dateRange.to, "yyyy-MM-dd")}</>
                            ) : (
                                format(dateRange.from, "yyyy-MM-dd")
                            )
                        ) : (
                            <span>Pick a date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        initialFocus
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>

        {/* Cashier Filter */}
        <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Cashier
            </label>
            <Select value={selectedCashier} onValueChange={setSelectedCashier} disabled={xReadings.length === 0}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Cashiers" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Cashiers</SelectItem>
                    {uniqueCashiers.map((cashier) => (
                        <SelectItem key={cashier} value={cashier}>
                            {cashier}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>



        <Button onClick={fetchXReadings} className="bg-white hover:bg-gray-100 text-black border border-gray-200 shadow-sm">
            Show Report
        </Button>
      </div>
      
        <div className="border-t pt-6">
            {hasSearched ? (
                isLoading ? (
                    <div className="flex items-center justify-center h-24">
                        <div className="text-muted-foreground">Loading X-readings...</div>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Shift ID</TableHead>
                                <TableHead>Shift Start</TableHead>
                                <TableHead>Shift End</TableHead>
                                <TableHead>Cashier</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Net Sales</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredReadings.length > 0 ? (
                                filteredReadings.map((reading) => (
                                    <TableRow key={reading.id}>
                                        <TableCell className="font-medium font-mono">
                                            {reading.id}
                                        </TableCell>
                                        <TableCell>
                                            {reading.shiftStart ? format(new Date(reading.shiftStart), 'PP p') : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            {reading.shiftEnd ? format(new Date(reading.shiftEnd), 'PP p') : 'Active'}
                                        </TableCell>
                                        <TableCell>{reading.cashierName || 'N/A'}</TableCell>
                                        <TableCell>
                                            <span className={cn(
                                                "px-2 py-1 rounded-full text-xs font-semibold",
                                                reading.shiftStatus === 'active' ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                                            )}>
                                                {reading.shiftStatus}
                                            </span>
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
                                                    onClick={() => handlePrint(reading)}
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
                                        No X-readings found for the selected {selectedCashier !== 'all' ? 'cashier' : 'date'}.
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
                <h2 className="text-lg font-medium text-gray-700">X-READING</h2>
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
                    <XReadingPreview 
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
                        onClick={handleReactToPrintFn}
                        disabled={!selectedReading}
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
