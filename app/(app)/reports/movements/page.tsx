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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowUpRight, ArrowDownLeft, Minus, RefreshCcw, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { ReportHeader } from '@/components/reports/ReportHeader';
import { getApiUrl } from '@/lib/api-config';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

interface StockMovement {
  id: string;
  product_name: string;
  movement_type: string;
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  reference_type: string | null;
  notes: string | null;
  created_at: string;
  sku: string;
  barcode: string;
  unit_of_measure: string;
}

export default function StockMovementPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date states
  const [startDate, setStartDate] = useState(format(new Date().setDate(new Date().getDate() - 30), 'yyyy-MM-dd')); // Default last 30 days
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [movementType, setMovementType] = useState('all');

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: 'Stock Movement Report',
  });

  useEffect(() => {
    fetchData();
  }, []); // Initial load

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (movementType && movementType !== 'all') params.append('type', movementType);

      const res = await fetch(getApiUrl(`/reports/movements?${params.toString()}`));
      const data = await res.json();
      
      if (data.success) {
        setMovements(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stock movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'sale': return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'purchase': return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'return': return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'adjustment': return <RefreshCcw className="h-4 w-4 text-orange-500" />;
      case 'transfer': return <RefreshCcw className="h-4 w-4 text-blue-500" />;
      default: return <Minus className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stock Movement Report</h2>
          <p className="text-muted-foreground">
            Track inventory history and changes.
          </p>
        </div>
        <Button onClick={() => handlePrint()} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Print Report
        </Button>
      </div>

      <Card>
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
             <div className="grid gap-2">
                <label className="text-sm font-medium">Movement Type</label>
                <Select value={movementType} onValueChange={setMovementType}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="sale">Sale</SelectItem>
                        <SelectItem value="purchase">Purchase</SelectItem>
                        <SelectItem value="adjustment">Adjustment</SelectItem>
                        <SelectItem value="return">Return</SelectItem>
                    </SelectContent>
                </Select>
             </div>
             <Button onClick={() => { setPage(1); fetchData(); }}>Filter Report</Button>
           </div>
        </CardHeader>
      </Card>
      
      <div ref={componentRef} className="print:p-8 printable-area">
        <ReportHeader 
            title="Stock Movement Report" 
            subtitle="History of stock changes (Sales, Purchases, Adjustments)."
            period={`${startDate} to ${endDate}`}
        />
        <div className="rounded-md border bg-card text-card-foreground shadow-sm print:border-0 print:shadow-none print:overflow-visible">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : movements.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                        No movements found for the selected period.
                    </TableCell>
                </TableRow>
              ) : (
                movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="whitespace-nowrap">
                        {format(new Date(movement.created_at), 'MMM dd, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2 capitalize">
                            {getMovementIcon(movement.movement_type)}
                            {movement.movement_type}
                        </div>
                    </TableCell>
                    <TableCell className="font-medium">{movement.product_name}</TableCell>
                    <TableCell>{movement.barcode || '-'}</TableCell>
                    <TableCell className={`text-right font-bold ${movement.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
                    </TableCell>
                    <TableCell className="text-right">
                        {movement.new_stock}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground capitalize">
                        {movement.reference_type} 
                        {movement.notes && ` - ${movement.notes}`}
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
