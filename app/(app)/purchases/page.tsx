'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
import { PurchaseOrder, Product, SystemSettings } from '../../../lib/types';
import { mockProducts } from '../../../lib/data';
import { usePurchaseOrders, useProducts, useBusinessProfile, useSuppliers } from '../../../hooks/use-api';
import { format as formatFns } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { AddPurchaseOrderDialog } from './add-purchase-order-dialog';
import { ReceivePurchaseOrderDialog } from './receive-purchase-order-dialog';
import { ViewPurchaseOrderDialog } from './view-purchase-order-dialog';
import { ScheduledOrdersDialog } from './scheduled-orders-dialog';
import { exportToCSV, exportToPDF } from './purchase-order-export-utils';
import { PurchasesFilterDialog } from './purchases-filter-dialog';

import { Button } from '@/components/ui/button';
import { Check, Truck, Search, CalendarIcon, X, Printer, ArrowLeft, Download, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Logo } from '@/components/logo';


import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, FileText, Ban, RotateCcw, Edit, Copy, PlusCircle } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getApiUrl } from '@/lib/api-config';
import { toSafeNumber } from '@/lib/utils';

import { printPurchaseOrder } from './purchase-order-print-utils';

function PurchaseOrderActions({ 
  order, 
  onUpdateOrder, 
  onReceive, 
  onPrint, 
  onViewDetails,
  onReorder,
  onEdit 
}: { 
  order: PurchaseOrder, 
  onUpdateOrder: (id: string, updates: Partial<PurchaseOrder>) => void, 
  onReceive: (order: PurchaseOrder) => void,
  onPrint: () => void,
  onViewDetails: () => void,
  onReorder: (order: PurchaseOrder) => void,
  onEdit: (order: PurchaseOrder) => void
}) {
  const { toast } = useToast();
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false);

  const handleApprove = () => {
    onUpdateOrder(order.id, { status: 'Approved' });
    toast({ title: 'Order Approved', description: `Order ${order.id.substring(0, 7)} has been approved.` });
  };

  const handleVoid = () => {
    onUpdateOrder(order.id, { status: 'Cancelled' });
    toast({ title: "Order Voided", description: "Purchase order has been cancelled." });
    setIsVoidDialogOpen(false);
  };

  return (
    <>
      <AlertDialog open={isVoidDialogOpen} onOpenChange={setIsVoidDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Purchase Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the purchase order and mark it as voided. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleVoid} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Void Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          
          {/* Status Actions */}
          {(order.status === 'Draft' || order.status === 'Pending') && (
            <DropdownMenuItem onClick={handleApprove}>
              <Check className="mr-2 h-4 w-4" /> Approve
            </DropdownMenuItem>
          )}
          
          {['Approved', 'Paid', 'Shipped'].includes(order.status) && (
            <DropdownMenuItem onClick={() => onReceive(order)}>
               <Truck className="mr-2 h-4 w-4" /> Receive Items
            </DropdownMenuItem>
          )}
  
          {/* General Actions */}
          <DropdownMenuItem onClick={onViewDetails}>
            <FileText className="mr-2 h-4 w-4" /> View Details
          </DropdownMenuItem>
  
          <DropdownMenuItem onClick={() => onReorder(order)}>
             <Copy className="mr-2 h-4 w-4" /> Reorder
          </DropdownMenuItem>
  
           {/* Edit - Only for Pending ideally, or allow restricted edits. For now basic. */}
           {(order.status === 'Draft' || order.status === 'Pending') && (
               <DropdownMenuItem onClick={() => onEdit(order)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
               </DropdownMenuItem>
           )}
  
          <DropdownMenuItem onClick={onPrint}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          {/* Destructive / Final Actions */}
          {(order.status === 'Draft' || order.status === 'Pending' || order.status === 'Approved') && (
              <DropdownMenuItem 
                onSelect={(e) => {
                  e.preventDefault();
                  setIsVoidDialogOpen(true);
                }} 
                className="text-destructive focus:text-destructive"
              >
                 <Ban className="mr-2 h-4 w-4" /> Void / Cancel
              </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function PurchaseOrderRow({ 
  order, 
  onUpdateOrder, 
  onReceive, 
  onPrint, 
  onReorder,
  onEdit,
  onViewDetails
}: { 
  order: PurchaseOrder, 
  onUpdateOrder: (id: string, updates: Partial<PurchaseOrder>) => void, 
  onReceive: (order: PurchaseOrder) => void, 
  onPrint: (order: PurchaseOrder) => void, 
  onReorder: (order: PurchaseOrder) => void, 
  onEdit: (order: PurchaseOrder) => void, 
  onViewDetails: (order: PurchaseOrder) => void 
}) {
  
  const statusVariant = (status: string) => {
    switch (status) {
      case 'Paid':
      case 'Received': return 'success';
      case 'Draft':
      case 'Pending': return 'secondary';
      case 'Approved':
      case 'Shipped': return 'default';
      case 'Failed':
      case 'Cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const itemsSubtotal = order.items.reduce((acc, item) => acc + (toSafeNumber(item.cost) * toSafeNumber(item.quantity)), 0);
  
  return (
    <TableRow className="hover:bg-muted/50 transition-colors text-xs group">
      <TableCell className="w-8 p-1"></TableCell>
      <TableCell className="px-2 py-1 font-medium text-primary whitespace-nowrap">{order.referenceNumber || order.id.substring(0, 8).toUpperCase()}</TableCell>
      <TableCell className="px-2 py-1 whitespace-nowrap">{order.orderedBy || '-'}</TableCell>
      <TableCell className="px-2 py-1 text-right whitespace-nowrap">₱{itemsSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
      <TableCell className="px-2 py-1 text-right whitespace-nowrap">₱{(order.shippingFee || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
      <TableCell className="px-2 py-1 text-right whitespace-nowrap">₱{(order.vatAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
      <TableCell className="px-2 py-1 text-right font-bold whitespace-nowrap">₱{order.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
      <TableCell className="px-2 py-1 text-right whitespace-nowrap">₱{(order.receivedTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
      <TableCell className="px-2 py-1 max-w-[150px] truncate" title={order.supplierName}>{order.supplierName}</TableCell>
      <TableCell className="px-2 py-1 whitespace-nowrap">{formatFns(new Date(order.date), 'MMM dd, yyyy')}</TableCell>
      <TableCell className="px-2 py-1 whitespace-nowrap">{order.deliveryDate ? formatFns(new Date(order.deliveryDate), 'MMM dd, yyyy') : '-'}</TableCell>
      <TableCell className="px-2 py-1 text-center">
        <Badge variant={statusVariant(order.status) as any} className="rounded-sm uppercase text-[9px] px-1.5 py-0 min-w-[70px] justify-center h-5">
          {order.status}
        </Badge>
      </TableCell>
      <TableCell className="px-2 py-1 text-right">
        <PurchaseOrderActions 
          order={order} 
          onUpdateOrder={onUpdateOrder} 
          onReceive={onReceive} 
          onPrint={() => onPrint(order)}
          onViewDetails={() => onViewDetails(order)}
          onReorder={onReorder}
          onEdit={onEdit}
        />
      </TableCell>
    </TableRow>
  );
}

function PurchaseOrderSkeleton() {
  return (
    <TableRow>
      <TableCell className='w-12'><Skeleton className="h-5 w-5 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell className="px-2 py-1 text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
      <TableCell className="px-2 py-1 text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
      <TableCell className="px-2 py-1 text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
      <TableCell className="px-2 py-1 text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
      <TableCell className="px-2 py-1 text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
    </TableRow>
  );
}

export default function PurchasesPage() {
  const { products } = useProducts();
  const { profile } = useBusinessProfile();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const [reorderData, setReorderData] = useState<PurchaseOrder | null>(null);
  const [isReorderOpen, setIsReorderOpen] = useState(false);
  
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);
  const [orderToReceive, setOrderToReceive] = useState<PurchaseOrder | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  
  const [isScheduledOrderOpen, setIsScheduledOrderOpen] = useState(false);
  const [scheduledSupplierId, setScheduledSupplierId] = useState<string | undefined>(undefined);

  const [pageSize, setPageSize] = useState(50);
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    fetch(getApiUrl('/pos-settings'))
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSettings(data.data);
        }
      })
      .catch(err => console.error('Failed to fetch settings:', err));
  }, []);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');

  const { suppliers } = useSuppliers('', 1, 100);

  // Use the real API hook with updated filters
  const { purchaseOrders, loading, refetch, pagination } = usePurchaseOrders(
    searchTerm, 
    statusFilter, 
    currentPage, 
    pageSize,
    dateRange?.from ? formatFns(dateRange.from, 'yyyy-MM-dd') : undefined,
    dateRange?.to ? formatFns(dateRange.to, 'yyyy-MM-dd') : undefined,
    supplierFilter
  );

  const updatePurchaseOrder = async (id: string, updates: any) => {
    try {
      const response = await fetch(getApiUrl(`/purchase-orders/${id}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const result = await response.json();
      if (result.success) {
        refetch();
      } else {
         throw new Error(result.error || 'Failed to update');
      }
    } catch (error) {
      console.error('Failed to update purchase order:', error);
      // Optional: Toast error here or let child handle logic
    }
  };

  const handleReceiveConfirm = async (
    receivedItems: { productId: string; quantity: number; expirationDate?: string; sellingPrice?: number }[],
    badItems?: { productId: string; productName: string; quantity: number; cost: number; reason: string; description: string }[],
    allocationStrategy?: 'equal' | 'proportional'
  ) => {
    if (!orderToReceive) return;

    try {
      const enrichedReceivedItems = receivedItems.map(item => {
        // Robust ID matching (case-insensitive and type-neutral)
        const originalItem = orderToReceive.items.find(i => 
          String(i.productId).trim().toLowerCase() === String(item.productId).trim().toLowerCase()
        );
        
        const cost = originalItem ? toSafeNumber(originalItem.cost) : 0;
        return {
          ...item,
          productName: originalItem?.productName || originalItem?.name || 'Unknown Product',
          sku: originalItem?.productSku || originalItem?.sku || '',
          barcode: originalItem?.barcode || originalItem?.productBarcode || '',
          cost: cost,
          subtotal: cost * toSafeNumber(item.quantity)
        };
      });

      const receivedTotalValue = enrichedReceivedItems.reduce((acc, item) => acc + (item.subtotal || 0), 0);
      const userId = localStorage.getItem('mock-user-session') ? JSON.parse(localStorage.getItem('mock-user-session')!).uid : 'system';

      // 1. Update purchase order status and total (stock update, movements, AP sync handled by backend)
      const response = await fetch(getApiUrl(`/purchase-orders/${orderToReceive.id}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'Received',
          receivedTotal: receivedTotalValue,
          receivedItems: enrichedReceivedItems as any,
          allocationStrategy,
          userId,
          // Metadata for approvals snapshot
          supplierName: orderToReceive.supplierName || 'N/A',
          referenceNumber: orderToReceive.referenceNumber || orderToReceive.id,
          poTotal: toSafeNumber(orderToReceive.total),
          poGrandTotal: toSafeNumber(orderToReceive.grandTotal || orderToReceive.total)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const result = await response.json();

      if (result.pendingApproval) {
        toast({ 
          title: "Approval Required", 
          description: "Purchase receipt has been submitted for approval.",
        });
        setIsReceiveDialogOpen(false);
        setOrderToReceive(null);
        refetch();
        return;
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to update order');
      }

      // 2. Create bad order record if there are bad items
      if (badItems && badItems.length > 0) {
        const badOrderResponse = await fetch(getApiUrl('/bad-orders'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            purchaseOrderId: orderToReceive.id,
            supplierId: orderToReceive.supplierId,
            supplierName: orderToReceive.supplierName,
            reportedBy: userId,
            reportDate: new Date().toISOString(),
            status: 'Reported',
            items: badItems,
            notes: `Automatically created during receipt of PO #${orderToReceive.referenceNumber || orderToReceive.id}`,
            userId: userId,
          }),
        });

        if (!badOrderResponse.ok) {
          console.error('Failed to create bad order record');
        }
      }

      toast({ 
        title: "Stock Received", 
        description: badItems && badItems.length > 0 
          ? `Inventory updated and ${badItems.length} bad items recorded.`
          : "Inventory has been updated successfully." 
      });
      setIsReceiveDialogOpen(false);
      setOrderToReceive(null);
      refetch();
      window.dispatchEvent(new Event('stock-updated'));
    } catch (error) {
      console.error('Failed to receive items:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update stock items.", 
        variant: "destructive" 
      });
    }
  };

  const addPurchaseOrder = async (order: PurchaseOrder) => {
    try {
      // TODO: Implement API call to create purchase order
      console.log('Adding purchase order:', order);
      // For now, just refetch the data
      refetch();
      setEditingOrder(null); // Clear edit state
    } catch (error) {
      console.error('Failed to add purchase order:', error);
    }
  };

  // API handles search and pagination. We use the results directly.
  const filteredPurchaseOrders = purchaseOrders;

  const handleSearch = () => {
    setSearchTerm(searchQuery);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSearchQuery('');
    setDateRange(undefined);
    setStatusFilter('all');
    setSupplierFilter('all');
    setCurrentPage(1);
  };

  // Reset to page 1 when page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  const handlePrint = (order: PurchaseOrder) => {
    printPurchaseOrder(order, profile, products);
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (supplierFilter !== 'all') params.append('supplierId', supplierFilter);
      if (dateRange?.from) params.append('startDate', formatFns(dateRange.from, 'yyyy-MM-dd'));
      if (dateRange?.to) params.append('endDate', formatFns(dateRange.to, 'yyyy-MM-dd'));

      const response = await fetch(getApiUrl(`/purchase-orders/export?${params.toString()}`));
      const result = await response.json();

      if (!result.success) throw new Error(result.error || 'Export failed');

      const fileName = `purchase_orders_${formatFns(new Date(), 'yyyyMMdd_HHmm')}`;
      if (format === 'csv') {
        await exportToCSV(result.data, fileName);
      } else {
        await exportToPDF(result.data, fileName, profile);
      }

      toast({ title: "Export Successful", description: `Your ${format.toUpperCase()} file has been generated.` });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: "Export Failed", description: "An error occurred during export.", variant: "destructive" });
    }
  };

  const handleEdit = (order: PurchaseOrder) => {
      setEditingOrder(order);
      setIsEditOpen(true);
  };
  
  const handleReorder = (order: PurchaseOrder) => {
      setReorderData(order);
      setIsReorderOpen(true);
  };

  const handleViewDetails = (order: PurchaseOrder) => {
    setViewingOrder(order);
  };

  const hasActiveFilters = searchTerm || dateRange;

  return (
    <Card className="printable-area">
      <CardHeader className="non-printable">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Purchases</CardTitle>
            <CardDescription>
              A list of all purchase orders from your suppliers.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <ScheduledOrdersDialog 
                onCreateOrder={(supplierId) => {
                    setScheduledSupplierId(supplierId);
                    setIsScheduledOrderOpen(true);
                }} 
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <AddPurchaseOrderDialog 
              onAddOrder={addPurchaseOrder} 
              trigger={
                <Button size="sm" className="shadow-lg shadow-black/30">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Purchase Order
                </Button>
              }
            />
            
            {isScheduledOrderOpen && (
                <AddPurchaseOrderDialog 
                    open={isScheduledOrderOpen}
                    onOpenChange={setIsScheduledOrderOpen}
                    prefillSupplierId={scheduledSupplierId}
                    onAddOrder={(order) => {
                        addPurchaseOrder(order);
                        setIsScheduledOrderOpen(false);
                    }}
                />
            )}
            
            {(isEditOpen && editingOrder) && (
                <AddPurchaseOrderDialog 
                    editOrder={editingOrder} 
                    open={isEditOpen}
                    onOpenChange={setIsEditOpen}
                    onAddOrder={(order) => {
                        addPurchaseOrder(order);
                        setIsEditOpen(false);
                    }}
                /> 
            )}

            {(isReorderOpen && reorderData) && (
                <AddPurchaseOrderDialog 
                    reorderData={reorderData} 
                    open={isReorderOpen}
                    onOpenChange={setIsReorderOpen}
                    onAddOrder={(order) => {
                        addPurchaseOrder(order);
                        setIsReorderOpen(false);
                    }}
                /> 
            )}

            {orderToReceive && (
              <ReceivePurchaseOrderDialog 
                open={isReceiveDialogOpen} 
                onOpenChange={setIsReceiveDialogOpen}
                order={orderToReceive}
                onConfirm={handleReceiveConfirm}
                requireConfirmation={settings?.requireReceiveConfirmation}
              />
            )}

            <ViewPurchaseOrderDialog 
              open={!!viewingOrder} 
              onOpenChange={(open) => !open && setViewingOrder(null)} 
              order={viewingOrder} 
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Search by ID, supplier..."
                className="pl-8 sm:w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
            </div>
            <Button variant="secondary" onClick={handleSearch}>Search</Button>

            <PurchasesFilterDialog 
              status={statusFilter}
              setStatus={setStatusFilter}
              supplierId={supplierFilter}
              setSupplierId={setSupplierFilter}
              dateRange={dateRange}
              setDateRange={setDateRange}
              suppliers={suppliers}
              onReset={resetFilters}
            />
          </div>
          <div className="flex items-center gap-2 non-printable">
            {hasActiveFilters && (
              <Button variant="ghost" onClick={resetFilters} size="sm" className="h-8 px-2 text-xs">
                <X className="mr-1 h-3 w-3" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="m-4">
          <Table 
            className="text-xs" 
            wrapperClassName="max-h-[calc(100vh-320px)] overflow-auto rounded-md border border-separate border-spacing-0"
          >
            <TableHeader className="bg-muted/50 backdrop-blur-sm">
              <TableRow className="hover:bg-transparent bg-muted/50">
                <TableHead className="w-8 p-1 text-center"></TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground whitespace-nowrap">Ref No</TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground whitespace-nowrap">Ordered by</TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground text-right whitespace-nowrap">Order Total</TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground text-right whitespace-nowrap">Shipping</TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground text-right whitespace-nowrap">Included Vat</TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground text-right whitespace-nowrap">Grand total</TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground text-right whitespace-nowrap">Received Total</TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground whitespace-nowrap">Supplier</TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground whitespace-nowrap">Issue date</TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground whitespace-nowrap">Delivery date</TableHead>
                <TableHead className="h-8 px-2 py-1 font-semibold text-foreground text-center whitespace-nowrap">Status</TableHead>
                <TableHead className="w-8 p-1"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchaseOrders?.map((order) => (
                <PurchaseOrderRow
                  key={order.id}
                  order={order}
                  onUpdateOrder={updatePurchaseOrder}
                  onReceive={(order) => {
                    setOrderToReceive(order);
                    setIsReceiveDialogOpen(true);
                  }}
                  onPrint={handlePrint}
                  onReorder={handleReorder}
                  onEdit={handleEdit}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </TableBody>
          </Table>
        </div>
        
        {pagination && pagination.total > 0 && (
          <div className="py-2 border-t px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page:</span>
              <Select
                value={pageSize.toString()}
                onValueChange={(val: string) => setPageSize(parseInt(val))}
              >
                <SelectTrigger className="h-8 w-[70px] text-xs">
                  <SelectValue placeholder={pageSize.toString()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Pagination className="w-auto mx-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                <PaginationItem>
                  <span className="text-xs text-muted-foreground px-4 whitespace-nowrap">
                    Page {currentPage} of {Math.ceil(pagination.total / pageSize)}
                  </span>
                </PaginationItem>

                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => p + 1)}
                    className={!pagination.hasMore ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
