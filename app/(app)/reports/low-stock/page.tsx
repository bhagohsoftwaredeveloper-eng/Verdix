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
import { Loader2, Printer, AlertTriangle, Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { ReportHeader } from '@/components/reports/ReportHeader';
import { getApiUrl } from '@/lib/api-config';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

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
  
  // Search and Pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: 'Low Stock Report',
  });

  useEffect(() => {
    fetchData(currentPage, searchQuery);
  }, [currentPage, searchQuery, limit]);

  const fetchData = async (page = 1, search = searchQuery) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lowStock: 'true',
        page: page.toString(),
        limit: limit.toString(),
        ...(search ? { search } : {})
      });
      const res = await fetch(getApiUrl(`/reports/inventory?${params.toString()}`));
      const data = await res.json();
      
      if (data.success) {
        setProducts(data.data);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setCurrentPage(data.pagination.page);
        }
      }
    } catch (error) {
      console.error('Failed to fetch low stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearchQuery(searchTerm);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleLimitChange = (value: string) => {
    setLimit(Number(value));
    setCurrentPage(1);
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

      <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center justify-between non-printable">
        <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} className="gap-2">
            Search
          </Button>
          {(searchTerm || searchQuery) && (
            <Button variant="ghost" onClick={handleClearSearch} className="gap-2 text-muted-foreground">
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
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

          {!loading && products.length > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 non-printable pt-4 border-t">
                <div className="flex items-center gap-2 order-2 sm:order-1">
                    <Label htmlFor="rows-per-page" className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</Label>
                    <Select 
                        value={limit.toString()} 
                        onValueChange={handleLimitChange}
                    >
                        <SelectTrigger id="rows-per-page" className="h-8 w-[70px] text-xs">
                            <SelectValue placeholder={limit.toString()} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="order-1 sm:order-2">
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                             <PaginationItem>
                                <span className="text-sm text-muted-foreground px-4">
                                    Page {currentPage} of {totalPages}
                                </span>
                             </PaginationItem>
                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            </div>
          )}
      </div>
    </div>
  );
}
