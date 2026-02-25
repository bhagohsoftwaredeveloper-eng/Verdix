'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { CalendarIcon, FileDown, DollarSign, TrendingUp, Receipt, Percent, Undo, LayoutGrid, Table as TableIcon, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import jsPDF from 'jspdf';
import { getApiUrl } from '@/lib/api-config';

interface ReturnRecord {
  soNo: string;
  orNo: string;
  transDate: string;
  soldByCashier: string;
  returnedDate: string;
  returnedByCashier: string;
  overrideBy: string;
  salesAmount: number;
  cost: number;
  profit: number;
  vatableSales: number;
  vatAmount: number;
  note: string;
}

export default function ReturnedSalesPage() {
  const [fromDate, setFromDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [toDate, setToDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [records, setRecords] = useState<ReturnRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();

  // Filter records based on search term
  const filteredRecords = records.filter(record => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    return (
      record.soNo?.toLowerCase().includes(search) ||
      record.orNo?.toLowerCase().includes(search) ||
      record.soldByCashier?.toLowerCase().includes(search) ||
      record.returnedByCashier?.toLowerCase().includes(search) ||
      record.overrideBy?.toLowerCase().includes(search) ||
      record.note?.toLowerCase().includes(search)
    );
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Calculate totals
  const totals = {
    revenue: records.reduce((sum, r) => sum + r.salesAmount, 0),
    cost: records.reduce((sum, r) => sum + r.cost, 0),
    profit: records.reduce((sum, r) => sum + r.profit, 0),
    vatableSales: records.reduce((sum, r) => sum + r.vatableSales, 0),
    vatAmount: records.reduce((sum, r) => sum + r.vatAmount, 0),
  };

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) {
        params.append('startDate', format(fromDate, 'yyyy-MM-dd'));
      }
      if (toDate) {
        params.append('endDate', format(toDate, 'yyyy-MM-dd'));
      }
      params.append('transactionType', 'return');

      const response = await fetch(getApiUrl(`/sales/transactions?${params.toString()}`));
      const result = await response.json();
      if (result.success) {
        const mappedRecords = result.data.map((tx: any) => ({
          soNo: tx.originalOrderNumber || 'N/A',
          orNo: tx.orderNumber || 'N/A',
          transDate: tx.originalTransactionTime || '',
          soldByCashier: tx.originalCashierName || 'N/A',
          returnedDate: tx.date || '',
          returnedByCashier: tx.cashier || 'N/A',
          overrideBy: tx.customer?.name || 'admin',
          salesAmount: Math.abs(tx.total || 0),
          cost: Math.abs(tx.cost || 0),
          profit: tx.profit || 0,
          vatableSales: Math.abs(tx.vatableSales || 0),
          vatAmount: Math.abs(tx.taxAmount || 0),
          note: tx.notes || ''
        }));
        setRecords(mappedRecords);
      }
    } catch (error) {
      console.error("Error fetching returns report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const exportToPDF = () => {
    if (records.length === 0) {
      toast({
        title: "No Data",
        description: "No records to export. Please fetch the report first.",
        variant: "destructive"
      });
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      let yPos = margin;

      // Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Merchandise Credit Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      // Date range
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const dateRangeText = `From: ${fromDate ? format(fromDate, 'yyyy-MM-dd') : 'N/A'} To: ${toDate ? format(toDate, 'yyyy-MM-dd') : 'N/A'}`;
      doc.text(dateRangeText, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Table headers
      const headers = ['SO No.', 'OR No.', 'Trans Date', 'Sold By', 'Return Date', 'Returned By', 'Override By', 'Sales Amt', 'Cost', 'Profit', 'Vatable', 'VAT', 'Note'];
      const colWidths = [20, 20, 22, 18, 22, 18, 18, 18, 16, 16, 18, 14, 30];
      
      // Draw header background
      doc.setFillColor(34, 197, 94);
      doc.rect(margin, yPos - 4, pageWidth - margin * 2, 8, 'F');
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      
      let xPos = margin;
      headers.forEach((header, i) => {
        doc.text(header, xPos + 1, yPos, { maxWidth: colWidths[i] - 2 });
        xPos += colWidths[i];
      });
      yPos += 6;

      // Reset text color for data rows
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);

      // Table rows
      records.forEach((record, rowIndex) => {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = margin;
          
          doc.setFillColor(34, 197, 94);
          doc.rect(margin, yPos - 4, pageWidth - margin * 2, 8, 'F');
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          xPos = margin;
          headers.forEach((header, i) => {
            doc.text(header, xPos + 1, yPos, { maxWidth: colWidths[i] - 2 });
            xPos += colWidths[i];
          });
          yPos += 6;
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
        }

        if (rowIndex % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, yPos - 3, pageWidth - margin * 2, 6, 'F');
        }

        xPos = margin;
        const rowData = [
          record.soNo,
          record.orNo,
          record.transDate ? format(new Date(record.transDate), 'MMM dd, yyyy') : '-',
          record.soldByCashier,
          record.returnedDate ? format(new Date(record.returnedDate), 'MMM dd, yyyy hh:mma') : '-',
          record.returnedByCashier,
          record.overrideBy,
          record.salesAmount.toFixed(2),
          record.cost.toFixed(2),
          record.profit.toFixed(2),
          record.vatableSales.toFixed(2),
          record.vatAmount.toFixed(2),
          record.note || ''
        ];

        rowData.forEach((cell, i) => {
          doc.text(String(cell), xPos + 1, yPos, { maxWidth: colWidths[i] - 2 });
          xPos += colWidths[i];
        });
        yPos += 6;
      });

      // Totals row
      yPos += 4;
      doc.setFillColor(200, 200, 200);
      doc.rect(margin, yPos - 4, pageWidth - margin * 2, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);

      xPos = margin;
      colWidths.forEach((width, i) => {
        if (i === 0) doc.text('TOTALS', xPos + 1, yPos);
        else if (i === 7) doc.text(totals.revenue.toFixed(2), xPos + 1, yPos);
        else if (i === 8) doc.text(totals.cost.toFixed(2), xPos + 1, yPos);
        else if (i === 9) doc.text(totals.profit.toFixed(2), xPos + 1, yPos);
        else if (i === 10) doc.text(totals.vatableSales.toFixed(2), xPos + 1, yPos);
        else if (i === 11) doc.text(totals.vatAmount.toFixed(2), xPos + 1, yPos);
        xPos += width;
      });

      const fileName = `Merchandise_Credit_Report_${format(fromDate || new Date(), 'yyyyMMdd')}_${format(toDate || new Date(), 'yyyyMMdd')}.pdf`;
      doc.save(fileName);

      toast({
        title: "PDF Exported",
        description: `Report saved as ${fileName}`,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Undo className="h-5 w-5 text-green-600" />
                Merchandise Credit Report
              </CardTitle>
              <CardDescription>
                View and analyze all returned sales transactions
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm border-green-600 text-green-600">
              {records.length} Return{records.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[180px] justify-start text-left font-normal",
                      !fromDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fromDate ? format(fromDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={setFromDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[180px] justify-start text-left font-normal",
                      !toDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {toDate ? format(toDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button 
              onClick={fetchReport} 
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Show Report'}
            </Button>

            <Button 
              onClick={exportToPDF} 
              disabled={isLoading || records.length === 0}
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export to PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <div className="h-4 w-4 flex items-center justify-center text-muted-foreground font-semibold text-base">₱</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totals.revenue)}</div>
            <p className="text-xs text-muted-foreground">Total returned sales amount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totals.cost)}</div>
            <p className="text-xs text-muted-foreground">Total product cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", totals.profit >= 0 ? "text-green-600" : "text-red-600")}>
              {formatCurrency(totals.profit)}
            </div>
            <p className="text-xs text-muted-foreground">Revenue minus cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vatable Sales</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(totals.vatableSales)}</div>
            <p className="text-xs text-muted-foreground">Sales excluding VAT</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VAT Amount</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totals.vatAmount)}</div>
            <p className="text-xs text-muted-foreground">Total VAT collected</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction Details</CardTitle>
              <CardDescription>
                Detailed list of all returned sales transactions
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-[250px]"
                />
              </div>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-8 px-3"
              >
                <TableIcon className="h-4 w-4 mr-1" />
                Table
              </Button>
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
                className="h-8 px-3"
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Cards
              </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className={viewMode === 'table' ? 'p-0' : 'pt-0'}>
          {viewMode === 'card' ? (
            /* Card View */
            paginatedRecords.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paginatedRecords.map((record, index) => (
                  <Card 
                    key={index} 
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      selectedRow === index && "ring-2 ring-primary"
                    )}
                    onClick={() => setSelectedRow(index)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base text-primary">{record.soNo}</CardTitle>
                          <CardDescription className="text-xs">{record.orNo}</CardDescription>
                        </div>
                        <Badge variant="outline" className="border-green-600 text-green-600">Returned</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Sold By</span>
                          <p className="font-medium truncate" title={record.soldByCashier}>{record.soldByCashier}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Returned By</span>
                          <p className="font-medium">{record.returnedByCashier || '-'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Trans Date</span>
                          <p>{record.transDate ? format(new Date(record.transDate), 'MMM dd, yyyy') : '-'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Return Date</span>
                          <p>{record.returnedDate ? format(new Date(record.returnedDate), 'MMM dd, yyyy') : '-'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs">Override By</span>
                          <p>{record.overrideBy || '-'}</p>
                        </div>
                      </div>
                      <div className="pt-2 border-t space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Amount</span>
                          <span className="font-mono font-semibold">{formatCurrency(record.salesAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Cost</span>
                          <span className="font-mono text-muted-foreground">{formatCurrency(record.cost)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Profit</span>
                          <span className={cn("font-mono font-semibold", record.profit >= 0 ? "text-green-600" : "text-red-600")}>
                            {formatCurrency(record.profit)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Vatable</span>
                          <span className="font-mono">{formatCurrency(record.vatableSales)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">VAT</span>
                          <span className="font-mono">{formatCurrency(record.vatAmount)}</span>
                        </div>
                      </div>
                      {record.note && (
                        <div className="pt-2 border-t">
                          <span className="text-muted-foreground text-xs">Note</span>
                          <p className="text-sm text-muted-foreground">{record.note}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 text-muted-foreground">
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    Loading...
                  </div>
                ) : (
                  'No returned sales found for the selected date range.'
                )}
              </div>
            )
          ) : (
          <Table className="w-full text-sm">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="py-2 px-3">SO No.</TableHead>
                <TableHead className="py-2 px-2">OR No.</TableHead>
                <TableHead className="py-2 px-2">Trans Date</TableHead>
                <TableHead className="py-2 px-2">Sold By</TableHead>
                <TableHead className="py-2 px-2">Return Date</TableHead>
                <TableHead className="py-2 px-2">Returned By</TableHead>
                <TableHead className="py-2 px-2">Override By</TableHead>
                <TableHead className="py-2 px-2 text-right">Amount</TableHead>
                <TableHead className="py-2 px-2 text-right">Cost</TableHead>
                <TableHead className="py-2 px-2 text-right">Profit</TableHead>
                <TableHead className="py-2 px-2 text-right">Vatable</TableHead>
                <TableHead className="py-2 px-2 text-right">VAT</TableHead>
                <TableHead className="py-2 px-2">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((record, index) => (
                  <TableRow 
                    key={index}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50 transition-colors text-xs",
                      selectedRow === index && "bg-muted"
                    )}
                    onClick={() => setSelectedRow(index)}
                  >
                    <TableCell className="py-2 px-3 font-medium text-primary">{record.soNo}</TableCell>
                    <TableCell className="py-2 px-2">{record.orNo}</TableCell>
                    <TableCell className="py-2 px-2">
                      {record.transDate ? format(new Date(record.transDate), 'MM/dd/yy hh:mma') : '-'}
                    </TableCell>
                    <TableCell className="py-2 px-2">{record.soldByCashier || '-'}</TableCell>
                    <TableCell className="py-2 px-2">
                      {record.returnedDate ? format(new Date(record.returnedDate), 'MM/dd/yy hh:mma') : '-'}
                    </TableCell>
                    <TableCell className="py-2 px-2">{record.returnedByCashier || '-'}</TableCell>
                    <TableCell className="py-2 px-2">{record.overrideBy || '-'}</TableCell>
                    <TableCell className="py-2 px-2 text-right font-mono">
                      {record.salesAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="py-2 px-2 text-right font-mono text-muted-foreground">
                      {record.cost.toFixed(2)}
                    </TableCell>
                    <TableCell className={cn(
                      "py-2 px-2 text-right font-mono",
                      record.profit >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {record.profit.toFixed(2)}
                    </TableCell>
                    <TableCell className="py-2 px-2 text-right font-mono">
                      {record.vatableSales.toFixed(2)}
                    </TableCell>
                    <TableCell className="py-2 px-2 text-right font-mono">
                      {record.vatAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="py-2 px-2 max-w-[80px] truncate text-muted-foreground" title={record.note || '-'}>
                      {record.note || '-'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={13} className="h-24 text-center">
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                        Loading...
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        No returned sales found for the selected date range.
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          )}
          
          {/* Pagination Controls */}
          {filteredRecords.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredRecords.length)} of {filteredRecords.length} entries
                </span>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page:</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1 px-2">
                    <span className="text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
