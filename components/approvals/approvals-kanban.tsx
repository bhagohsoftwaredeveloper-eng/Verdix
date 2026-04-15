'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { 
  ClipboardCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Eye, 
  Search, 
  LayoutGrid, 
  History, 
  AlertCircle, 
  Settings, 
  RefreshCcw, 
  UserCheck, 
  Printer 
} from 'lucide-react';
import { printApproval } from '@/lib/print-approval';
import { PrintPreviewDialog } from './print-preview-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ApprovalItem {
  id: string;
  transaction_type: string;
  transaction_data: any;
  status: 'Pending' | 'Approved' | 'Rejected';
  current_step: number;
  created_by: string;
  requester_name: string;
  requester_email: string;
  created_at: string;
  updated_at: string;
  currentStepRole: string;
  currentStepRoleId: string | null;
  history: any[];
  workflow: any[];
}

interface WorkflowColumn {
    id: string;
    title: string;
    role?: string;
    status?: string;
    isMeta?: boolean;
}

interface ApprovalsKanbanProps {
  onOpenSettings?: () => void;
  open?: boolean;
}

export function ApprovalsKanban({ onOpenSettings, open }: ApprovalsKanbanProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [dynamicColumns, setDynamicColumns] = useState<WorkflowColumn[]>([]);
  const [workflowConfigs, setWorkflowConfigs] = useState<Record<string, any[]>>({});
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const fetchQueue = async () => {
    try {
      setIsLoading(true);
      const [queueRes, wfRes] = await Promise.all([
        fetch('/api/approvals/queue?status=ALL'),
        fetch('/api/approvals/workflows')
      ]);
      
      const queueResult = await queueRes.json();
      const wfResult = await wfRes.json();

      if (wfResult.success) {
        setWorkflowConfigs(wfResult.data);
      }

      if (queueResult.success) {
        setItems(queueResult.data);
        generateColumns(queueResult.data, wfResult.success ? wfResult.data : undefined);
      }
    } catch (error) {
      console.error('Failed to fetch approval queue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateColumns = (queueItems: ApprovalItem[], configs?: Record<string, any[]>) => {
    const currentConfigs = configs || workflowConfigs;
    
    // 1. Fixed Initial column
    const cols: WorkflowColumn[] = [
        { id: 'initiated', title: 'Initiated', isMeta: true }
    ];

    // 2. Dynamic Role-based columns
    const rolesWithOrder = new Map<string, number>();
    
    // Inject configured roles for current type if not 'ALL'
    if (selectedType !== 'ALL' && currentConfigs[selectedType]) {
        currentConfigs[selectedType].forEach(step => {
            if (step.role_name) {
                rolesWithOrder.set(step.role_name, step.step_order);
            }
        });
    }

    // Still scan items to ensure we don't miss legacy/override roles
    queueItems.forEach(item => {
        item.workflow?.forEach(step => {
            if (step.role_name && !rolesWithOrder.has(step.role_name)) {
                rolesWithOrder.set(step.role_name, step.step_order);
            }
        });
        if (item.currentStepRole && item.currentStepRole !== 'Unknown' && !rolesWithOrder.has(item.currentStepRole)) {
            rolesWithOrder.set(item.currentStepRole, item.current_step);
        }
    });

    const sortedRoles = Array.from(rolesWithOrder.entries())
        .sort((a, b) => a[1] - b[1])
        .map(entry => entry[0]);

    sortedRoles.forEach(role => {
        cols.push({
            id: `role_${role.toString().replace(/\s+/g, '_').toLowerCase()}`,
            title: role,
            role: role
        });
    });

    const hasUnknown = queueItems.some(i => i.status === 'Pending' && i.currentStepRole === 'Unknown');
    if (hasUnknown) {
        cols.push({ id: 'unknown', title: 'Action Required (Missing Config)', role: 'Unknown' });
    }

    cols.push({ id: 'finalized', title: 'Finalized', status: 'Approved', isMeta: true });
    cols.push({ id: 'rejected', title: 'Rejected', status: 'Rejected', isMeta: true });

    setDynamicColumns(cols);
  };

  useEffect(() => {
    if (open) {
      fetchQueue();
    }
  }, [open]);

  useEffect(() => {
    const userSession = localStorage.getItem('mock-user-session');
    if (userSession) {
      const parsedUser = JSON.parse(userSession);
      setUser(parsedUser);
    }
  }, []);

  useEffect(() => {
    const itemsForColumns = selectedType === 'ALL' 
      ? items 
      : items.filter(i => i.transaction_type.toUpperCase() === selectedType.toUpperCase());
    generateColumns(itemsForColumns);
  }, [selectedType, items, workflowConfigs]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (selectedType !== 'ALL') {
        const targetType = selectedType.toUpperCase();
        result = result.filter(i => i.transaction_type.toUpperCase() === targetType);
    }
    if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        result = result.filter(item => 
            item.transaction_type.toLowerCase().includes(lowerSearch) ||
            item.requester_name.toLowerCase().includes(lowerSearch) ||
            item.id.includes(searchTerm)
        );
    }
    return result;
  }, [items, searchTerm, selectedType]);

  const processApproval = async (queueId: string, action: 'Approve' | 'Reject', notes: string = '') => {
    if (!user) return;
    setIsProcessing(true);
    try {
      const response = await fetch('/api/approvals/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueId,
          action,
          userId: user.uid,
          notes
        })
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: `Request ${action === 'Approve' ? 'Approved' : 'Rejected'}`,
          description: result.status,
        });
        setSelectedItem(null);
        fetchQueue();
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process approval',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getColumnItems = (column: WorkflowColumn) => {
    if (column.id === 'initiated') {
        return filteredItems.filter(i => i.status === 'Pending' && i.current_step === 1 && i.created_by === user?.uid);
    }
    if (column.status) {
        return filteredItems.filter(i => i.status === column.status);
    }
    if (column.role) {
        return filteredItems.filter(i => i.status === 'Pending' && i.currentStepRole === column.role);
    }
    return [];
  };

  const canAction = (item: ApprovalItem) => {
    if (!item || !user) return false;
    if (item.status !== 'Pending') return false;
    const matchesId = user.roleId && String(user.roleId) === String(item.currentStepRoleId);
    const matchesName = user.userType && String(user.userType) === String(item.currentStepRole);
    return !!(matchesId || matchesName);
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
        case 'STOCK_ADJUSTMENT': return 'bg-amber-100 text-amber-800 border-amber-200';
        case 'STOCK_TRANSFER': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'PURCHASE_ORDER': return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'RECEIVE_PO': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'BAD_ORDER': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-secondary/50 text-muted-foreground';
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Approval Kanban Board</h1>
          <p className="text-muted-foreground text-sm">Manage custom transaction workflows and multi-level sign-offs.</p>
        </div>
        <div className="flex items-center gap-2">
            <Tabs value={selectedType} onValueChange={setSelectedType} className="hidden lg:block">
                <TabsList className="bg-secondary/50 p-1 h-9">
                    <TabsTrigger value="ALL" className="text-[11px] h-7">All Requests</TabsTrigger>
                    <TabsTrigger value="STOCK_ADJUSTMENT" className="text-[11px] h-7">Adjustments</TabsTrigger>
                    <TabsTrigger value="STOCK_TRANSFER" className="text-[11px] h-7">Transfers</TabsTrigger>
                    <TabsTrigger value="PURCHASE_ORDER" className="text-[11px] h-7">POs</TabsTrigger>
                    <TabsTrigger value="RECEIVE_PO" className="text-[11px] h-7">Receives</TabsTrigger>
                    <TabsTrigger value="BAD_ORDER" className="text-[11px] h-7">Bad Orders</TabsTrigger>
                </TabsList>
            </Tabs>
            <div className="relative w-full max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search ID, user..."
                    className="pl-8 h-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Button onClick={fetchQueue} variant="outline" size="icon" className="h-9 w-9" title="Refresh Board">
                <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button 
                onClick={() => onOpenSettings?.()} 
                variant="outline" 
                className="h-9 px-3 gap-2"
            >
                <Settings className="h-4 w-4" /> <span className="hidden sm:inline">Workflow Settings</span>
            </Button>
        </div>
      </div>

      <div className="lg:hidden">
          <Tabs value={selectedType} onValueChange={setSelectedType} className="w-full">
            <TabsList className="grid grid-cols-3 bg-secondary/30 p-1 h-auto">
                <TabsTrigger value="ALL" className="text-[10px] break-all">All</TabsTrigger>
                <TabsTrigger value="STOCK_ADJUSTMENT" className="text-[10px] break-all">Adjust</TabsTrigger>
                <TabsTrigger value="STOCK_TRANSFER" className="text-[10px] break-all">Transfer</TabsTrigger>
                <TabsTrigger value="PURCHASE_ORDER" className="text-[10px] break-all">POs</TabsTrigger>
                <TabsTrigger value="RECEIVE_PO" className="text-[10px] break-all">Receive</TabsTrigger>
                <TabsTrigger value="BAD_ORDER" className="text-[10px] break-all">Bad</TabsTrigger>
            </TabsList>
          </Tabs>
      </div>

      <div className="flex flex-1 gap-2 pb-4 overflow-hidden min-h-0">
        {dynamicColumns.map((column) => (
          <div key={column.id} className="flex flex-col min-w-0 flex-1 bg-secondary/20 rounded-xl border border-border/50 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b bg-background/40 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 min-w-0">
                    <h3 className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground truncate">{column.title}</h3>
                    <Badge variant="secondary" className="rounded-full bg-background border-border/50 text-[10px] h-4 px-1">{getColumnItems(column).length}</Badge>
                </div>
            </div>
            <ScrollArea className="flex-1 p-3">
                <div className="flex flex-col gap-3">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <Card key={i} className="shadow-sm opacity-50">
                                <CardHeader className="p-4 space-y-2">
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-4 w-3/4" />
                                </CardHeader>
                            </Card>
                        ))
                    ) : getColumnItems(column).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 opacity-20">
                            <LayoutGrid className="h-8 w-8 mb-2" />
                            <p className="text-[10px] font-medium">No cards</p>
                        </div>
                    ) : (
                        getColumnItems(column).map((item) => (
                            <Card 
                                key={item.id} 
                                className={cn(
                                    "group shadow-sm transition-all hover:shadow-md cursor-pointer border-l-4 border-l-transparent",
                                    item.status === 'Approved' ? "hover:border-l-green-500" : 
                                    item.status === 'Rejected' ? "hover:border-l-red-500" : "hover:border-l-primary"
                                )}
                                onClick={() => setSelectedItem(item)}
                            >
                                <CardHeader className="p-3 pb-2">
                                    <div className="flex flex-col items-start gap-1.5 min-w-0">
                                        <Badge variant="outline" className={cn("text-[8.5px] leading-none py-1 h-auto whitespace-nowrap font-bold border-transparent px-1.5", getTypeStyle(item.transaction_type))}>
                                            {item.transaction_type.replace(/_/g, ' ')}
                                        </Badge>
                                        <span className="text-[9px] text-muted-foreground font-medium leading-none">
                                            Initiated: {new Date(item.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <CardTitle className="text-sm font-bold mt-1">
                                        ID: {item.id.substring(3, 11)}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 pt-0">
                                    <p className="text-[11px] text-muted-foreground line-clamp-2 min-h-[32px]">
                                        {item.transaction_type === 'STOCK_ADJUSTMENT' && (
                                            <>
                                                <span className="font-bold text-foreground">{item.transaction_data.productName || 'Product'}</span>: 
                                                {` Adjustment of ${item.transaction_data.quantity} units (${item.transaction_data.reason})`}
                                            </>
                                        )}
                                        {item.transaction_type === 'PURCHASE_ORDER' && `PO from ${item.transaction_data.supplierName || 'Supplier'} for ₱${(item.transaction_data.total || item.transaction_data.grandTotal || 0).toLocaleString()}`}
                                        {item.transaction_type === 'RECEIVE_PO' && `Receiving items for PO #${item.transaction_data.purchaseOrderId}`}
                                        {item.transaction_type === 'BAD_ORDER' && `Bad Order: ${item.transaction_data.items?.length || 0} items reported by ${item.transaction_data.reportedBy || 'Staff'}`}
                                        {item.transaction_type === 'STOCK_TRANSFER' && (
                                            <>
                                                <span className="font-bold text-foreground">{item.transaction_data.productName || 'Items'}</span>:
                                                {` ${item.transaction_data.fromWarehouseName || 'Source'} → ${item.transaction_data.toWarehouseName || 'Target'}`}
                                            </>
                                        )}
                                        {!['STOCK_ADJUSTMENT', 'PURCHASE_ORDER', 'RECEIVE_PO', 'BAD_ORDER', 'STOCK_TRANSFER'].includes(item.transaction_type) && 'Review transaction details'}
                                    </p>
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                                                {(item.requester_name || 'S').charAt(0)}
                                            </div>
                                            <span className="text-[10px] font-semibold truncate max-w-[80px]">{item.requester_name || 'System'}</span>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                                <Eye className="h-3.5 w-3.5 text-primary" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </ScrollArea>
          </div>
        ))}
      </div>

      {/* Details Modal */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl bg-background/95 backdrop-blur-xl border-border/50">
          <DialogHeader>
            <div className="flex justify-between items-center pr-8">
              <div className="flex items-center gap-4">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <ClipboardCheck className="h-6 w-6 text-primary" />
                  Review Transaction Request
                </DialogTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-2 px-3 border-primary/20 hover:bg-primary/5 text-primary font-bold"
                  onClick={() => setShowPrintPreview(true)}
                >
                  <Printer className="h-4 w-4" />
                  Print Details
                </Button>
              </div>
              <Badge 
                variant={selectedItem?.status === 'Approved' ? 'secondary' : 'default'} 
                className={cn(
                    "font-bold uppercase tracking-wider h-6 px-3",
                    selectedItem?.status === 'Approved' ? "bg-green-100 text-green-800 border-green-200" : 
                    selectedItem?.status === 'Rejected' ? "bg-red-100 text-red-800 border-red-200" : "bg-blue-100 text-blue-800 border-blue-200"
                )}
              >
                {selectedItem?.status === 'Pending' ? `Level ${selectedItem?.current_step}` : selectedItem?.status}
              </Badge>
            </div>
          </DialogHeader>

          {selectedItem && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mt-4">
              <div className="md:col-span-3 space-y-4">
                <div className="bg-secondary/20 p-5 rounded-2xl space-y-3 border border-border/50">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                    <History className="h-3 w-3" /> Transaction Data
                  </h4>
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <span className="text-muted-foreground font-medium">Type:</span>
                    <span className="font-bold">{selectedItem.transaction_type.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground font-medium">Reference ID:</span>
                    <span className="font-mono text-[11px] bg-background/50 px-2 py-0.5 rounded border">{selectedItem.id}</span>
                    
                    {selectedItem.transaction_type === 'STOCK_ADJUSTMENT' && (
                      <>
                        <span className="text-muted-foreground font-medium">Product:</span>
                        <div className="flex flex-col">
                            <span className="font-bold">{selectedItem.transaction_data.productName}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{selectedItem.transaction_data.productSku}</span>
                        </div>
                        <span className="text-muted-foreground font-medium">Stock Change:</span>
                        <div className="flex items-center gap-2 font-bold">
                            <span className="text-muted-foreground">{String(selectedItem.transaction_data.currentStock ?? 'N/A')}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className={cn(
                                (Number(selectedItem.transaction_data.quantity) || 0) > 0 ? "text-green-600" : "text-red-600"
                            )}>
                                {String((Number(selectedItem.transaction_data.quantity) || 0) > 0 ? '+' : '')}{String(selectedItem.transaction_data.quantity ?? 0)}
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="text-primary">
                                {selectedItem.transaction_data.currentStock !== undefined 
                                    ? String(Number(selectedItem.transaction_data.currentStock) + Number(selectedItem.transaction_data.quantity))
                                    : 'N/A'}
                            </span>
                        </div>
                      </>
                    )}

                    {selectedItem.transaction_type === 'STOCK_TRANSFER' && (
                      <>
                        <span className="text-muted-foreground font-medium">Items:</span>
                        <span className="font-bold">{selectedItem.transaction_data.productName || (selectedItem.transaction_data.items?.length + ' products')}</span>
                        <span className="text-muted-foreground font-medium">From:</span>
                        <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-200 justify-start h-auto py-1">
                            {selectedItem.transaction_data.fromWarehouseName || selectedItem.transaction_data.sourceWarehouseId}
                        </Badge>
                        <span className="text-muted-foreground font-medium">To:</span>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-900 border-emerald-200 justify-start h-auto py-1">
                            {selectedItem.transaction_data.toWarehouseName || selectedItem.transaction_data.targetWarehouseId}
                        </Badge>
                        {selectedItem.transaction_data.quantity && (
                            <>
                                <span className="text-muted-foreground font-medium">Quantity:</span>
                                <span className="font-bold text-primary">{selectedItem.transaction_data.quantity}</span>
                            </>
                        )}
                      </>
                    )}

                    {selectedItem.transaction_type === 'PURCHASE_ORDER' && (
                        <>
                            <span className="text-muted-foreground font-medium">Supplier:</span>
                            <span className="font-bold text-primary">{selectedItem.transaction_data.supplierName}</span>
                            <span className="text-muted-foreground font-medium">Amount:</span>
                            <span className="font-bold text-primary text-lg">
                                ₱{(Number(selectedItem.transaction_data.total || selectedItem.transaction_data.grandTotal) || 0).toLocaleString()}
                            </span>
                        </>
                    )}

                    {!['STOCK_ADJUSTMENT', 'STOCK_TRANSFER', 'PURCHASE_ORDER'].includes(selectedItem.transaction_type) && (
                        <>
                            <span className="text-muted-foreground font-medium">Value/Qty:</span>
                            <span className="font-bold text-primary">
                                {selectedItem.transaction_data.quantity || selectedItem.transaction_data.total || selectedItem.transaction_data.grandTotal || selectedItem.transaction_data.items?.length || 'N/A'}
                            </span>
                        </>
                    )}

                    <span className="text-muted-foreground font-medium">Notes/Reason:</span>
                    <span className="font-medium italic">"{selectedItem.transaction_data.reason || selectedItem.transaction_data.notes || 'Not specified'}"</span>
                  </div>
                  
                  {selectedItem.transaction_data.items && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Line Items</p>
                          <ScrollArea className="h-32">
                              <div className="space-y-1 pr-3">
                                  {selectedItem.transaction_data.items.map((it: any, k: number) => (
                                      <div key={k} className="flex justify-between text-[11px] p-2 bg-background/30 rounded border border-border/30">
                                          <span className="font-medium">{it.productName || it.name}</span>
                                          <span className="font-bold text-primary">x{it.quantity}</span>
                                      </div>
                                  ))}
                              </div>
                          </ScrollArea>
                      </div>
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                        {(selectedItem.requester_name || 'S').charAt(0)}
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase text-primary tracking-widest leading-none mb-1">Requester</p>
                        <p className="text-base font-bold leading-none">{selectedItem.requester_name || 'System'}</p>
                        <p className="text-xs text-muted-foreground mt-1">{selectedItem.requester_email || 'System Operation'}</p>
                    </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                    <UserCheck className="h-3 w-3" /> Approval Path
                </h4>
                <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-primary/50 before:to-border">
                    {selectedItem.workflow.map((step, idx) => {
                        const historyItem = selectedItem.history.find(h => h.step_number === step.step_order);
                        const isCurrent = selectedItem.status === 'Pending' && selectedItem.current_step === step.step_order;
                        return (
                            <div key={idx} className="relative">
                                <span className={cn(
                                    "absolute -left-[22px] top-1.5 h-3 w-3 rounded-full border-2 transition-all shadow-sm",
                                    historyItem ? "border-green-500 bg-green-500" : 
                                    isCurrent ? "border-primary bg-primary animate-pulse" : "border-border bg-background"
                                )} />
                                <div className="space-y-0.5">
                                    <p className={cn("text-xs font-bold", isCurrent ? "text-primary" : "text-foreground")}>{step.role_name}</p>
                                    {historyItem ? (
                                        <p className="text-[10px] text-green-600 font-medium">{historyItem.action}ed on {new Date(historyItem.created_at).toLocaleDateString()}</p>
                                    ) : (
                                        <p className="text-[10px] text-muted-foreground font-medium italic">
                                            {isCurrent ? "Awaiting Review..." : "Pending"}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="pt-6 mt-6 border-t border-border/50 space-y-3">
                    {selectedItem.status === 'Pending' && (
                        <>
                            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest text-center">Decision Actions</p>
                            <div className="flex flex-col gap-2">
                                <Button 
                                    className="w-full font-bold shadow-lg" 
                                    disabled={isProcessing || !canAction(selectedItem)}
                                    onClick={() => processApproval(selectedItem.id, 'Approve')}
                                >
                                    Approve Transaction
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="w-full font-bold text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                                    disabled={isProcessing || !canAction(selectedItem)}
                                    onClick={() => processApproval(selectedItem.id, 'Reject')}
                                >
                                    Reject & Decline
                                </Button>
                            </div>
                            {!canAction(selectedItem) && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100 text-[10px] text-amber-800 font-medium">
                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                    <span>Only users with the <strong>{selectedItem.currentStepRole}</strong> role can take action on this step.</span>
                                </div>
                            )}
                            <p className="text-[9px] text-muted-foreground text-center italic mt-2">
                                {canAction(selectedItem) 
                                  ? "Clicking approve will move this request to the next stage or finalize it if this is the last step."
                                  : "You do not have the required permissions to approve this transaction."}
                            </p>
                        </>
                    )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PrintPreviewDialog 
        item={selectedItem}
        open={showPrintPreview}
        onOpenChange={setShowPrintPreview}
      />
    </div>
  );
}
