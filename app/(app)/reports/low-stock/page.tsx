'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Printer, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { ReportHeader } from '@/components/reports/ReportHeader';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  stock: number;
  unit_of_measure: string;
  reorder_point: number;
}

export default function LowStockReportPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: 'Low Stock Report',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Reusing the inventory API with lowStock=true
      const res = await fetch(`/api/reports/inventory?lowStock=true`);
      const data = await res.json();
      
      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch low stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-8 w-8" />
            Low Stock Report
          </h2>
          <p className="text-muted-foreground">
            Products that have fallen below their reorder point.
          </p>
        </div>
        <Button onClick={() => handlePrint()} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Print Report
        </Button>
      </div>

      <div ref={componentRef} className="bg-background p-4 rounded-md border print:border-0 print:p-8 print:shadow-none printable-area">
          <ReportHeader title="Low Stock Report" subtitle="Products that have fallen below their reorder point." />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Reorder Point</TableHead>
                <TableHead className="text-right">Status</TableHead>
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
                    <TableCell colSpan={6} className="h-24 text-center text-green-600 font-medium">
                        Good news! No products are currently low on stock.
                    </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.sku}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                        {product.stock} {product.unit_of_measure}
                    </TableCell>
                    <TableCell className="text-right">
                        {product.reorder_point}
                    </TableCell>
                    <TableCell className="text-right">
                        <Badge variant="destructive">Restock Needed</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </div>
    </div>
  );
}
