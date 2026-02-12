'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { Loader2, Printer } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useReactToPrint } from 'react-to-print';
import { ReportHeader } from '@/components/reports/ReportHeader';

import { DataTablePagination } from '@/components/ui/data-table-pagination';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  stock: number;
  unit_of_measure: string;
  cost: number;
  price: number;
  reorder_point: number;
  total_value: number;
}

interface Summary {
  totalItems: number;
  totalStock: number;
  totalValue: number;
}

interface PaginationState {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
}

export default function InventoryReportPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalItems: 0, totalStock: 0, totalValue: 0 });
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: 'Stock on Hand Report',
  });

  useEffect(() => {
    fetchData();
  }, [selectedCategory, page, pageSize]);
  
  // Separate effect to fetch categories only once on mount
  useEffect(() => {
      // In a real app we'd fetch distinct categories from an API
      // For now, we rely on existing products or a separate call
      // Optimization: Fetch all categories once.
      // Since we don't have a dedicated category endpoint readily available in context, 
      // providing a hardcoded lists or fetching valid categories is better.
      // I'll skip dynamic category fetching for this step to focus on pagination unless critical.
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      params.append('page', page.toString());
      params.append('limit', pageSize.toString());
      
      const res = await fetch(`/api/reports/inventory?${params.toString()}`);
      const data = await res.json();
      
      if (data.success) {
        setProducts(data.data);
        setSummary(data.summary);
        
        if (data.pagination) {
            setTotalPages(data.pagination.totalPages);
            setTotalItems(data.pagination.totalItems);
        }
      }
    } catch (error) {
      console.error('Failed to fetch inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stock on Hand Report</h2>
          <p className="text-muted-foreground">
            Current inventory levels and valuation.
          </p>
        </div>
        <Button onClick={() => handlePrint()} variant="outline" className="gap-2">
            <Printer className="h-4 w-4" />
            Print Report
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-[200px]">
            <Select value={selectedCategory} onValueChange={(val) => {
                setSelectedCategory(val);
                setPage(1); // Reset to first page on filter change
            }}>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by Category" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {/* Ideally populate this dynamically */}
                    <SelectItem value="Beverages">Beverages</SelectItem>
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Alcohol">Alcohol</SelectItem>
                    <SelectItem value="Tobacco">Tobacco</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalStock}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value (Avg Cost)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Printable Area */}
      <div ref={componentRef} className="bg-background p-4 rounded-md border print:border-0 print:p-8 print:shadow-none printable-area">
          <ReportHeader title="Stock on Hand Report" subtitle="Current inventory levels and valuation." />
          
          <div className="rounded-md border mb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Product Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : products.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                            No products found.
                        </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                            {product.name}
                            {product.stock <= product.reorder_point && (
                                <Badge variant="destructive" className="ml-2 print:hidden">Low Stock</Badge>
                            )}
                        </TableCell>
                        <TableCell>{product.sku}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.cost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                            {product.stock} {product.unit_of_measure}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                            {formatCurrency(product.total_value)}
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

          {/* Footer Summary for Print */}
          {!loading && (
             <div className="mt-8 border-t pt-4 flex justify-between print:flex hidden">
                 <div>
                     <p className="font-bold">Summary</p>
                     <p>Total Items: {summary.totalItems}</p>
                 </div>
                 <div className="text-right">
                     <p>Total Quantity: {summary.totalStock}</p>
                     <p className="font-bold text-lg">Total Value: {formatCurrency(summary.totalValue)}</p>
                 </div>
             </div>
          )}
      </div>
    </div>
  );
}
