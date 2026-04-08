'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MoreHorizontal, X, Printer, Eye } from 'lucide-react';
import { useBadOrders } from '@/hooks/use-api';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ViewBadOrderDialog } from './view-bad-order-dialog';
import { RecordBadOrderDialog } from './record-bad-order-dialog';
import { BadOrderStats } from './bad-order-stats';
import { useBadOrderStats } from '@/hooks/use-api';
import { printBadOrder } from '@/lib/print-bad-order';

function BadOrderSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-5 w-28" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-9 w-20 ml-auto" /></TableCell>
    </TableRow>
  );
}

export default function BadOrdersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [pageSize, setPageSize] = useState(10);

  const { badOrders, loading, refetch, pagination } = useBadOrders(
    searchTerm,
    statusFilter || undefined,
    currentPage,
    pageSize
  );
  const { stats } = useBadOrderStats();

  const handleSearch = () => {
    setSearchTerm(searchQuery);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSearchQuery('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case 'Resolved':
      case 'Replaced':
      case 'Credited':
        return 'default';
      case 'Reported':
        return 'destructive';
      case 'Return Requested':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const hasActiveFilters = searchTerm || statusFilter;

  return (
    <div className="space-y-4">
      <BadOrderStats />
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Bad Orders</CardTitle>
              <CardDescription>
                Track and manage defective or damaged items from suppliers
              </CardDescription>
            </div>
            <RecordBadOrderDialog onSuccess={refetch} />
          </div>
          <div className="flex items-center justify-between gap-4 pt-4">
            <div className="relative flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by ID, PO, supplier..."
                  className="pl-8 sm:w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button variant="secondary" onClick={handleSearch}>
                Search
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Reported">Reported</SelectItem>
                  <SelectItem value="Return Requested">Return Requested</SelectItem>
                  <SelectItem value="Replaced">Replaced</SelectItem>
                  <SelectItem value="Credited">Credited</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" onClick={resetFilters} size="icon">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Reset filters</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table wrapperClassName="max-h-[calc(100vh-400px)] overflow-auto relative m-4 border rounded-md">
            <TableHeader className="sticky top-0 z-30 bg-background shadow-sm">
              <TableRow className="hover:bg-transparent bg-muted/50">
                <TableHead className="font-semibold text-foreground">Bad Order ID</TableHead>
                <TableHead className="font-semibold text-foreground">Supplier</TableHead>
                <TableHead className="font-semibold text-foreground">Report Date</TableHead>
                <TableHead className="font-semibold text-foreground text-right">Total Value</TableHead>
                <TableHead className="font-semibold text-foreground text-center">Status</TableHead>
                <TableHead className="font-semibold text-foreground">Reported By</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <>
                  <BadOrderSkeleton />
                  <BadOrderSkeleton />
                  <BadOrderSkeleton />
                </>
              ) : badOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No bad orders found
                  </TableCell>
                </TableRow>
              ) : (
                badOrders.map((order) => (
                  <TableRow key={order.id} className="text-xs group hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {order.id.substring(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell>{order.supplierName || '-'}</TableCell>
                    <TableCell>{format(new Date(order.reportDate), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="text-right font-medium">
                      ₱{order.totalAffectedValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={
                        order.status === 'Resolved' || order.status === 'Replaced' || order.status === 'Credited' ? 'secondary' :
                        order.status === 'Return Requested' ? 'default' :
                        'outline'
                      } className="rounded-sm font-normal text-[10px] h-5">
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.reportedBy || '-'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingOrder(order)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => printBadOrder(order)}>
                            <Printer className="mr-2 h-4 w-4" />
                            Print Report
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {pagination && pagination.total > 0 && (
            <div className="py-2 border-t px-4">
              <DataTablePagination
                currentPage={currentPage}
                totalPages={Math.ceil(pagination.total / pageSize)}
                pageSize={pageSize}
                totalItems={pagination.total}
                setPage={setCurrentPage}
                setPageSize={setPageSize}
              />
            </div>
          )}
        </CardContent>

        <ViewBadOrderDialog
          open={!!viewingOrder}
          onOpenChange={(open: boolean) => !open && setViewingOrder(null)}
          badOrder={viewingOrder}
          onUpdate={refetch}
        />
      </Card>
    </div>
  );
}
