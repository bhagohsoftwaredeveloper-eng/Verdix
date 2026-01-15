'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Eye, X, RefreshCw, CalendarIcon, FileText, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { XReadingPreview, XReadingData } from './x-reading-preview';

type PrinterFormat = '58mm' | '80mm';

export default function XReadingPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  
  // These shifts populate the dropdown for the specific date
  const [shiftsForDate, setShiftsForDate] = useState<XReadingData[]>([]);
  
  // These are the filtered results shown in the table (could be same as filtering by shift)
  const [filteredReadings, setFilteredReadings] = useState<XReadingData[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [selectedReading, setSelectedReading] = useState<XReadingData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [printerFormat, setPrinterFormat] = useState<PrinterFormat>('80mm');
  
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);

  // Load shifts whenever the date changes
  useEffect(() => {
    const fetchShiftsForDate = async () => {
      if (!date) return;
      
      setLoading(true);
      try {
        const formattedDate = format(date, 'yyyy-MM-dd');
        // Fetch all shifts for the day to populate the dropdown
        const response = await fetch(`/api/sales/x-reading?startDate=${formattedDate}&endDate=${formattedDate}`);
        const result = await response.json();

        if (result.success) {
            setShiftsForDate(result.data);
            setFilteredReadings(result.data); // Show all for the day by default in table
        } else {
            setShiftsForDate([]);
            setFilteredReadings([]);
            toast({
                title: "Error",
                description: "Failed to load shifts for selected date.",
                variant: "destructive"
            });
        }
      } catch (error) {
        console.error('Error loading shifts:', error);
        setShiftsForDate([]);
        setFilteredReadings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchShiftsForDate();
  }, [date, toast]);

  const handleShowReport = () => {
    if (!selectedShiftId || selectedShiftId === 'all') {
        // If no specific shift selected, maybe just show all in table? 
        // Or warn user? The screenshot implies they select a specific shift.
        // If "all" is active in dropdown or empty, we just show the table which is already populated.
        // But if they picked one, we should probably open the preview immediately?
        // Let's assume the button filters the table or opens preview if 1 selected.
        toast({
            title: "Info",
            description: "Showing all reports for the selected date.",
        });
        setFilteredReadings(shiftsForDate);
        return;
    }

    const reading = shiftsForDate.find(s => s.id === selectedShiftId);
    if (reading) {
        setFilteredReadings([reading]); // Filter table to just this one
        setSelectedReading(reading);
        setIsPreviewOpen(true); // Auto-open preview? "Show Report" implies viewing it.
    }
  };
  
  // Format for the dropdown option: "CashierName - Terminal (Time)"
  const getShiftLabel = (r: XReadingData) => {
      const time = r.shiftStart ? format(new Date(r.shiftStart), 'hh:mm a') : 'N/A';
      return `${r.cashierName} - ${r.terminalId} (${time})`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async (reading: XReadingData) => {
     // Similar implementation to Z-Reading if needed, or just keep placeholder
      toast({ title: "Export PDF", description: "Not yet implemented for X-Reading" });
  };

  const handleExportImage = async (reading: XReadingData) => {
      toast({ title: "Export Image", description: "Not yet implemented for X-Reading" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4 p-1 bg-background rounded-lg">
        {/* Date Filter */}
        <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Date</label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn("w-[240px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "yyyy-MM-dd") : "Pick a date"}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
            </Popover>
        </div>

        {/* Cashier Shift Dropdown */}
        <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Cashier Shift</label>
            <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
                <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder={loading ? "Loading..." : "Select active shift"} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Shifts</SelectItem>
                    {shiftsForDate.map(shift => (
                        <SelectItem key={shift.id} value={shift.id}>
                            {getShiftLabel(shift)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        {/* Show Report Button */}
        <Button onClick={handleShowReport} className="bg-white hover:bg-gray-100 text-black border border-gray-200 shadow-sm">
            Show Report
        </Button>
      </div>

      {/* Results Table */}
      <div className="border-t pt-6">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Reading ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Terminal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Net Sales</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {filteredReadings.length === 0 ? (
                 <TableRow>
                    <TableCell colSpan={7} className="text-center h-24">
                        {loading ? "Loading..." : "No X-reading reports found for the selected date."}
                    </TableCell>
                </TableRow>
            ) : filteredReadings.map((reading) => (
                <TableRow key={reading.id}>
                <TableCell className="font-medium">{reading.id.substring(0, 8)}</TableCell>
                <TableCell>{format(new Date(reading.reportDate), 'PP p')}</TableCell>
                <TableCell>{reading.cashierName}</TableCell>
                <TableCell>{reading.terminalId}</TableCell>
                <TableCell>
                    <Badge variant={reading.shiftStatus === 'active' ? 'default' : 'secondary'}>
                    {reading.shiftStatus}
                    </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                    ₱{reading.netSales.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => {
                        setSelectedReading(reading);
                        setIsPreviewOpen(true);
                    }}>
                    <Eye className="h-4 w-4" />
                    </Button>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
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
                    <XReadingPreview data={selectedReading} printerFormat={printerFormat} />
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
