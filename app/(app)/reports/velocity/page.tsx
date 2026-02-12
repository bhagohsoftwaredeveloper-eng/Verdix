'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Loader2, TrendingUp, TrendingDown, Printer } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { ReportHeader } from '@/components/reports/ReportHeader';

import { DataTablePagination } from '@/components/ui/data-table-pagination';

interface VelocityProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  total_sold: number;
  total_revenue: number;
}

export default function FastSlowMovingReportPage() {
  const [products, setProducts] = useState<VelocityProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'fast' | 'slow'>('fast');
  
  // Default lookback 30 days
  const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const endDate = format(new Date(), 'yyyy-MM-dd');

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: 'Product Velocity Report',
  });

  useEffect(() => {
    fetchData();
  }, [activeTab, page, pageSize]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('type', activeTab);
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      params.append('page', page.toString());
      params.append('limit', pageSize.toString());

      const res = await fetch(`/api/reports/velocity?${params.toString()}`);
      const data = await res.json();
      
      if (data.success) {
        setProducts(data.data);
        if (data.pagination) {
            setTotalPages(data.pagination.totalPages);
            setTotalItems(data.pagination.totalItems);
        }
      }

    } catch (error) {
      console.error('Failed to fetch velocity data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Product Velocity Report</h2>
          <p className="text-muted-foreground">
            Analysis of fast and slow moving products over the last 30 days.
          </p>
        </div>
        <Button onClick={() => handlePrint()} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Print Report
        </Button>
      </div>

      <div ref={componentRef} className="print:p-8 printable-area">
        <ReportHeader 
            title="Product Velocity Report" 
            subtitle="Analysis of fast and slow moving products."
            period={`${startDate} to ${endDate}`}
        />

        <Tabs value={activeTab} onValueChange={(v) => {
            setActiveTab(v as 'fast' | 'slow');
            setPage(1); // Reset page on tab change
        }} className="w-full">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2 print:hidden">
            <TabsTrigger value="fast" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Fast Moving
            </TabsTrigger>
            <TabsTrigger value="slow" className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Slow Moving
            </TabsTrigger>
          </TabsList>
          
            <Card className="print:border-0 print:shadow-none bg-transparent border-0 shadow-none">
              <CardHeader className="print:px-0 px-0">
                <CardTitle>{activeTab === 'fast' ? 'Top Selling Products' : 'Slow Moving Products'}</CardTitle>
                <CardDescription>
                    {activeTab === 'fast' 
                        ? 'Highest turnover items in the last 30 days.' 
                        : 'Lowest turnover items in the last 30 days. Consider discounting.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="print:px-0 px-0">
                <div className="rounded-md border mb-4">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Units Sold (30d)</TableHead>
                        <TableHead className="text-right">Revenue Generated</TableHead>
                        <TableHead className="text-right">Current Stock</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                            </TableCell>
                        </TableRow>
                        ) : products.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No data available.
                            </TableCell>
                        </TableRow>
                        ) : (
                        products.map((product, index) => (
                            <TableRow key={product.id}>
                            <TableCell className="font-medium text-muted-foreground">
                                #{((page - 1) * pageSize) + index + 1}
                            </TableCell>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>{product.category}</TableCell>
                            <TableCell className={`text-right font-bold ${activeTab === 'fast' ? 'text-green-600' : 'text-orange-600'}`}>
                                {product.total_sold}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(product.total_revenue)}</TableCell>
                            <TableCell className="text-right">{product.stock}</TableCell>
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
              </CardContent>
            </Card>
        </Tabs>
      </div>
    </div>
  );
}
