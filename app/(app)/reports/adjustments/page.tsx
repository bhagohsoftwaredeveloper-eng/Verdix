'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Loader2, Printer, ClipboardX } from 'lucide-react';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { ReportHeader } from '@/components/reports/ReportHeader';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

interface Adjustment {
  id: string;
  product_name: string;
  sku: string;
  quantity: number;
  reason: string;
  new_stock: number;
  created_at: string;
  unit_of_measure: string;
}

export default function AdjustmentReportPage() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState(format(new Date().setDate(new Date().getDate() - 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: 'Stock Adjustment Report',
  });

  useEffect(() => {
    fetchData();
  }, [page, pageSize]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('page', page.toString());
      params.append('limit', pageSize.toString());

      const res = await fetch(`/api/reports/adjustments?${params.toString()}`);
      const data = await res.json();
      
      if (data.success) {
        setAdjustments(data.data);
        if (data.pagination) {
            setTotalPages(data.pagination.totalPages);
            setTotalItems(data.pagination.totalItems);
        }
      }
    } catch (error) {
      console.error('Failed to fetch adjustments:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Adjustment / Damaged Report</h2>
          <p className="text-muted-foreground">
            Log of manual stock corrections, damaged goods, and losses.
          </p>
        </div>
        <Button onClick={() => handlePrint()} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Print Report
        </Button>
      </div>

       <Card className="print:hidden">
        <CardHeader>
           <div className="flex flex-wrap gap-4 items-end">
             <div className="grid gap-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input 
                   type="date" 
                   value={startDate} 
                   onChange={(e) => setStartDate(e.target.value)} 
                   className="w-[180px]"
                />
             </div>
             <div className="grid gap-2">
                <label className="text-sm font-medium">End Date</label>
                <Input 
                   type="date" 
                   value={endDate} 
                   onChange={(e) => setEndDate(e.target.value)} 
                   className="w-[180px]"
                />
             </div>
             <Button onClick={() => { setPage(1); fetchData(); }}>Filter Report</Button>
           </div>
        </CardHeader>
      </Card>

      <div ref={componentRef} className="bg-background p-4 rounded-md border print:border-0 print:p-8 print:shadow-none printable-area">
          <ReportHeader 
              title="Stock Adjustment Report" 
              subtitle="Log of manual stock corrections, damaged goods, and losses." 
              period={`${startDate} to ${endDate}`}
          />

          <div className="rounded-md border mb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Adjustment</TableHead>
                <TableHead className="text-right">New Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : adjustments.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        No adjustments found for this period.
                    </TableCell>
                </TableRow>
              ) : (
                adjustments.map((adj) => (
                  <TableRow key={adj.id}>
                    <TableCell>
                        {format(new Date(adj.created_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="font-medium">{adj.product_name}</TableCell>
                    <TableCell>{adj.sku}</TableCell>
                    <TableCell className="capitalize">
                        {adj.reason === 'damaged' && <ClipboardX className="inline-block w-4 h-4 mr-1 text-red-500"/>}
                        {adj.reason}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${adj.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {adj.quantity > 0 ? '+' : ''}{adj.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                        {adj.new_stock}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

          <DataTablePagination 
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            setPage={setPage}
            setPageSize={setPageSize}
          />
      </div>
    </div>
  );
}
