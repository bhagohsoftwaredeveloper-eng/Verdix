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
import { CalendarIcon, FileDown, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, PhilippinePeso, Users, TrendingUp, Package } from 'lucide-react';
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
import { getApiUrl } from '@/lib/api-config';
import jsPDF from 'jspdf';

interface SupplierPurchase {
  supplierId: string;
  supplierName: string;
  contactPerson: string;
  totalOrders: number;
  totalSpent: number;
  lastPurchaseDate: string;
}

export default function PurchasesBySupplierPage() {
  const [fromDate, setFromDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [toDate, setToDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [records, setRecords] = useState<SupplierPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { toast } = useToast();

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
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(getApiUrl(`/reports/purchases/by-supplier?${params.toString()}`));
      const result = await response.json();
      if (result.success) {
        setRecords(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching purchases by supplier:", error);
      toast({
        title: "Error",
        description: "Failed to fetch supplier spending data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  // Client-side filtering and pagination
  const filteredRecords = records.filter(record => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    return (
      record.supplierName?.toLowerCase().includes(search) ||
      record.contactPerson?.toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totals = {
    totalSpent: records.reduce((sum, r) => sum + r.totalSpent, 0),
    totalSuppliers: records.length,
    avgSpentPerSupplier: records.length > 0 ? records.reduce((sum, r) => sum + r.totalSpent, 0) / records.length : 0,
    totalOrders: records.reduce((sum, r) => sum + r.totalOrders, 0),
  };

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

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Purchases by Supplier Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const dateRangeText = `From: ${fromDate ? format(fromDate, 'yyyy-MM-dd') : 'N/A'} To: ${toDate ? format(toDate, 'yyyy-MM-dd') : 'N/A'}`;
      doc.text(dateRangeText, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Suppliers: ${totals.totalSuppliers}`, margin, yPos);
      doc.text(`Total Spent: ₱${totals.totalSpent.toFixed(2)}`, margin + 60, yPos);
      doc.text(`Total Orders: ${totals.totalOrders}`, margin + 120, yPos);
      yPos += 10;

      const headers = ['Supplier Name', 'Contact Person', 'Total Orders', 'Total Spent', 'Last Purchase Date', '% of Total'];
      const colWidths = [70, 50, 30, 40, 40, 30];
      
      doc.setFillColor(37, 99, 235);
      doc.rect(margin, yPos - 4, pageWidth - margin * 2, 8, 'F');
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      
      let xPos = margin;
      headers.forEach((header, i) => {
        doc.text(header, xPos + 2, yPos, { maxWidth: colWidths[i] - 4 });
        xPos += colWidths[i];
      });
      yPos += 6;

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      records.forEach((record, rowIndex) => {
        if (yPos > pageHeight - 20) {
          doc.addPage();
          yPos = margin;
          
          doc.setFillColor(37, 99, 235);
          doc.rect(margin, yPos - 4, pageWidth - margin * 2, 8, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          xPos = margin;
          headers.forEach((header, i) => {
            doc.text(header, xPos + 2, yPos, { maxWidth: colWidths[i] - 4 });
            xPos += colWidths[i];
          });
          yPos += 6;
          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
        }

        if (rowIndex % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, yPos - 3, pageWidth - margin * 2, 6, 'F');
        }

        const percentage = totals.totalSpent > 0 ? ((record.totalSpent / totals.totalSpent) * 100).toFixed(1) + '%' : '0%';

        xPos = margin;
        const rowData = [
          record.supplierName || 'N/A',
          record.contactPerson || '-',
          record.totalOrders.toString(),
          `₱${record.totalSpent.toFixed(2)}`,
          record.lastPurchaseDate ? format(new Date(record.lastPurchaseDate), 'yyyy-MM-dd') : '-',
          percentage
        ];

        rowData.forEach((cell, i) => {
          doc.text(String(cell), xPos + 2, yPos, { maxWidth: colWidths[i] - 4 });
          xPos += colWidths[i];
        });
        yPos += 6;
      });

      const fileName = `Purchases_By_Supplier_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
      doc.save(fileName);

      toast({
        title: "PDF Exported",
        description: `Report saved as ${fileName}`,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF.",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                Purchases by Supplier Report
              </CardTitle>
              <CardDescription>
                Analysis of spending and engagement per supplier
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-sm border-indigo-600 text-indigo-600">
              {records.length} Supplier{records.length !== 1 ? 's' : ''}
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isLoading ? 'Loading...' : 'Show Report'}
            </Button>

            <Button 
              onClick={exportToPDF} 
              disabled={isLoading || records.length === 0}
              variant="outline"
              className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export to PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <PhilippinePeso className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{formatCurrency(totals.totalSpent)}</div>
            <p className="text-xs text-muted-foreground">Across all suppliers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totals.totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">Engaged suppliers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Supplier</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(totals.avgSpentPerSupplier)}</div>
            <p className="text-xs text-muted-foreground">Average wallet share</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total POs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totals.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Total purchase orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Supplier Spending Details</CardTitle>
              <CardDescription>
                Detailed breakdown of purchases per supplier
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-[300px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="py-2 px-4">Supplier Name</TableHead>
                <TableHead className="py-2 px-4">Contact Person</TableHead>
                <TableHead className="py-2 px-4 text-right">Total Orders</TableHead>
                <TableHead className="py-2 px-4 text-right">Total Spent</TableHead>
                <TableHead className="py-2 px-4">Last Purchase</TableHead>
                <TableHead className="py-2 px-4 text-right">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((record, index) => {
                  const percentage = totals.totalSpent > 0 ? (record.totalSpent / totals.totalSpent) * 100 : 0;
                  return (
                    <TableRow key={index} className="hover:bg-muted/50 transition-colors text-sm">
                      <TableCell className="py-2 px-4 font-medium">{record.supplierName}</TableCell>
                      <TableCell className="py-2 px-4 text-muted-foreground">{record.contactPerson || '-'}</TableCell>
                      <TableCell className="py-2 px-4 text-right font-mono">{record.totalOrders}</TableCell>
                      <TableCell className="py-2 px-4 text-right font-mono font-semibold text-indigo-600">
                        {formatCurrency(record.totalSpent)}
                      </TableCell>
                      <TableCell className="py-2 px-4">
                        {record.lastPurchaseDate ? format(new Date(record.lastPurchaseDate), 'MMM dd, yyyy') : '-'}
                      </TableCell>
                      <TableCell className="py-2 px-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-semibold">{percentage.toFixed(1)}%</span>
                          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                        Loading...
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        No supplier purchase data found for the selected range.
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

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
