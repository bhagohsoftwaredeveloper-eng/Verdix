'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Search,
  Plus,
  Trash2,
  Package,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Loader2,
  Layers,
  CheckCircle2,
  AlertCircle,
  X,
  Warehouse as WarehouseIcon,
  Tag,
  FileText,
  Repeat
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Product, Warehouse, Supplier } from '@/lib/types';
import { getProducts } from '../products/actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AdjustmentItem {
  product: Product;
  quantity: number;
  type: 'add' | 'remove' | 'transfer';
  reason: string;
  targetProductId?: string; // For transfers
}

interface BulkAdjustmentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BulkAdjustmentDrawer({ open, onOpenChange, onSuccess }: BulkAdjustmentDrawerProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  
  // New State Fields
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove' | 'transfer'>('add');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState('');
  const [note, setNote] = useState('');

  const [adjustments, setAdjustments] = useState<AdjustmentItem[]>([]);
  const [globalReason, setGlobalReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (open) {
      loadProducts();
      loadMetadata();
    }
  }, [open]);

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const data = await getProducts();
      setAllProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const loadMetadata = async () => {
    setIsLoadingMetadata(true);
    try {
      const [whRes, supRes] = await Promise.all([
        fetch('/api/warehouses?activeOnly=true').then(r => r.json()),
        fetch('/api/suppliers').then(r => r.json())
      ]);
      if (whRes.success) setWarehouses(whRes.data);
      if (supRes.success) setSuppliers(supRes.data);
    } catch (error) {
      console.error('Failed to load metadata:', error);
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return [];
    
    let filtered = allProducts;
    
    // If a source warehouse is selected, filter products to only those in that warehouse
    if (warehouseId) {
      filtered = filtered.filter(p => p.warehouseId === warehouseId || p.warehouse === warehouseId);
    }

    return filtered.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.sku.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 50); 
  }, [allProducts, search, warehouseId]);

  const addProduct = (product: Product) => {
    if (adjustments.some(a => a.product.id === product.id)) {
      toast({
        title: 'Product already added',
        description: `${product.name} is already in the adjustment list.`,
      });
      return;
    }
    setAdjustments([
      ...adjustments,
      { product, quantity: 1, type: adjustmentType, reason: '' }
    ]);
    setSearch('');
  };

  const removeAdjustment = (productId: string) => {
    setAdjustments(adjustments.filter(a => a.product.id !== productId));
  };

  const updateAdjustment = (productId: string, updates: Partial<AdjustmentItem>) => {
    setAdjustments(adjustments.map(a => 
      a.product.id === productId ? { ...a, ...updates } : a
    ));
  };

  const handleProcessAdjustments = async () => {
    if (adjustments.length === 0) return;

    if (adjustmentType === 'transfer' && !targetWarehouseId) {
      toast({
        variant: 'destructive',
        title: 'Target Warehouse Required',
        description: 'Please select a destination warehouse for the transfer.',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const userSession = localStorage.getItem('mock-user-session');
      const userId = userSession ? JSON.parse(userSession).uid : 'system';

      const payload = {
        adjustments: adjustments.map(a => ({
          productId: a.product.id,
          quantity: a.quantity,
          reason: a.reason || globalReason || 'Bulk Stock Adjustment',
          targetProductId: a.targetProductId 
        })),
        notes: note || globalReason || 'Bulk Stock Adjustment',
        userId,
        warehouseId,
        targetWarehouseId,
        referenceNo,
        supplierId,
        adjustmentType
      };

      const response = await fetch('/api/inventory/adjust/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Bulk Adjustment Successful',
          description: (
            <div className="flex flex-col gap-1">
              <p>Processed: {result.processed} items</p>
              {result.queued > 0 && <p className="text-amber-600">Queued for approval: {result.queued} items</p>}
            </div>
          ),
        });
        setAdjustments([]);
        setGlobalReason('');
        onSuccess?.();
        onOpenChange(false);
      } else {
        throw new Error(result.error || 'Failed to process adjustments');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Adjustment Failed',
        description: error.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="top" className="h-screen w-screen p-0 flex flex-col bg-slate-50 border-none">
        <div className="p-6 border-b bg-white z-10 shadow-sm flex items-center justify-between">
          <SheetHeader className="space-y-1 text-left">
            <SheetTitle className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Layers className="h-6 w-6 text-primary" />
              Bulk Stock Adjustment
            </SheetTitle>
            <SheetDescription className="text-base">
              Apply adjustments to multiple products simultaneously.
            </SheetDescription>
          </SheetHeader>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
              <X className="h-6 w-6" />
            </Button>
          </SheetClose>
        </div>

        <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
          {/* LEFT COLUMN: Search & Table Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
            {/* Product Search Bar */}
            <div className="px-6 py-4 flex gap-4 items-end border-b bg-white shadow-sm sticky top-0 z-20">
              <div className="flex-1 relative">
                <Label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Add Products to Batch</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={warehouseId ? `Search in ${warehouses.find(w => w.id === warehouseId)?.name}...` : "Search by name or SKU..."}
                    className="pl-10 h-11 bg-white border-slate-200 focus-visible:ring-primary shadow-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {/* Search Results Popover */}
                {search.trim() && (
                  <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 max-h-[300px] overflow-y-auto overflow-x-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {isLoadingProducts ? (
                      <div className="p-8 text-center flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-sm text-slate-500 font-medium">Loading catalog...</p>
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        <p className="font-medium">{warehouseId ? "No matches in this warehouse" : "No matches found"}</p>
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {filteredProducts.map((p) => (
                          <button
                            key={p.id}
                            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 text-left transition-colors group border border-transparent hover:border-slate-100"
                            onClick={() => addProduct(p)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-slate-900 group-hover:text-primary truncate">{p.name}</p>
                              <p className="text-xs text-slate-500 font-mono tracking-wider">{p.sku}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <Badge variant="outline" className="h-6 px-2 text-[10px] font-bold bg-slate-50/50">
                                {p.stock} <span className="ml-1 opacity-60 uppercase">{p.unitOfMeasure}</span>
                              </Badge>
                              <div className="bg-primary/10 p-1.5 rounded-md text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus className="h-4 w-4" />
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="w-[300px]">
                <Label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Current Record Override Reason</Label>
                <Input
                  placeholder="Applies to items without reasons..."
                  className="h-11 bg-white border-slate-200 focus-visible:ring-primary shadow-sm text-right"
                  value={globalReason}
                  onChange={(e) => setGlobalReason(e.target.value)}
                />
              </div>
            </div>

            {/* Main Table List Area */}
            <ScrollArea className="flex-1">
              <div className="p-6">
                {adjustments.length === 0 ? (
                  <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-300">
                      <Package className="h-12 w-12" />
                    </div>
                    <div className="max-w-md space-y-2">
                      <h3 className="text-xl font-bold text-slate-900">Your adjustment list is empty</h3>
                      <p className="text-slate-500">
                        Search and select products above to begin building your batch.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow className="hover:bg-transparent border-b">
                          <TableHead className="w-[300px] py-4 text-xs font-bold text-slate-500 uppercase tracking-widest pl-6">Product Details</TableHead>
                          <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Type</TableHead>
                          <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Batch Qty</TableHead>
                          <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Stock Impact</TableHead>
                          <TableHead className="py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Note</TableHead>
                          <TableHead className="w-[50px] py-4"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adjustments.map((adj) => {
                          const newStock = adj.type === 'remove' ? adj.product.stock - adj.quantity : adj.product.stock + adj.quantity;
                          const isNegative = newStock < 0;

                          return (
                            <TableRow key={adj.product.id} className="group border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                              <TableCell className="py-5 pl-6">
                                <div className="flex flex-col gap-1">
                                  <span className="font-bold text-slate-900 group-hover:text-primary transition-colors flex items-center gap-2">
                                    {adj.product.name}
                                    {adj.type === 'transfer' && <Repeat className="h-3 w-3 text-primary animate-pulse" />}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{adj.product.sku}</span>
                                    {adj.product.warehouseName && (
                                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                        <WarehouseIcon className="h-3 w-3" />
                                        {adj.product.warehouseName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "h-8 px-3 font-bold uppercase tracking-tight gap-1.5",
                                    adj.type === 'add' ? "bg-green-50 text-green-700 border-green-200" :
                                    adj.type === 'remove' ? "bg-red-50 text-red-700 border-red-200" :
                                    "bg-primary/5 text-primary border-primary/20"
                                  )}
                                >
                                  {adj.type === 'add' ? <TrendingUp className="h-3.5 w-3.5" /> : 
                                   adj.type === 'remove' ? <TrendingDown className="h-3.5 w-3.5" /> : 
                                   <Repeat className="h-3.5 w-3.5" />}
                                  {adj.type === 'add' ? 'Add' : adj.type === 'remove' ? 'Remove' : 'Transfer'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <Input
                                    type="number"
                                    min="1"
                                    className="h-10 w-24 mx-auto text-center font-bold bg-white border-slate-200 focus:ring-primary"
                                    value={adj.quantity}
                                    onChange={(e) => updateAdjustment(adj.product.id, { quantity: Math.max(0, parseInt(e.target.value) || 0) })}
                                  />
                                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{adj.product.unitOfMeasure}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="flex flex-col items-center">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Old</span>
                                    <Badge variant="outline" className="font-mono bg-white">{adj.product.stock}</Badge>
                                  </div>
                                  <ArrowRight className="h-4 w-4 text-slate-300" />
                                  <div className="flex flex-col items-center">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">New</span>
                                    <Badge 
                                      variant={isNegative ? 'destructive' : 'default'} 
                                      className={cn("font-bold min-w-[32px] justify-center", !isNegative && "bg-green-600 hover:bg-green-700")}
                                    >
                                      {newStock}
                                    </Badge>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-2">
                                  <div className="relative">
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                    <Input
                                      placeholder="Note..."
                                      className="h-10 pl-9 text-xs bg-white border-slate-200 focus:ring-primary"
                                      value={adj.reason}
                                      onChange={(e) => updateAdjustment(adj.product.id, { reason: e.target.value })}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="pr-6">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                  onClick={() => removeAdjustment(adj.product.id)}
                                >
                                  <Trash2 className="h-4.5 w-4.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* RIGHT COLUMN: Configuration Sidebar */}
          <div className="w-[400px] bg-white border-l shadow-xl flex flex-col z-10 animate-in slide-in-from-right-4 duration-300">
            <div className="p-6 border-b bg-slate-50/50 flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 leading-none">Batch Details</h3>
                <p className="text-[11px] text-slate-500 mt-1 font-medium uppercase tracking-tight">Configure metadata for this session</p>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Adjustment Type */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Adjustment Mode</Label>
                    <Badge variant="outline" className="text-[10px] font-bold bg-slate-100">GLOBAL</Badge>
                  </div>
                  <Select 
                    value={adjustmentType} 
                    onValueChange={(v: any) => {
                      setAdjustmentType(v);
                      setAdjustments(adjustments.map(a => ({ ...a, type: v })));
                    }}
                  >
                    <SelectTrigger className="h-12 border-slate-200 ring-offset-background hover:bg-slate-50 transition-colors">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add" className="font-medium text-green-700">Add (Positive adjustment)</SelectItem>
                      <SelectItem value="remove" className="font-medium text-red-700">Negative adjustment</SelectItem>
                      <SelectItem value="transfer" className="font-medium text-primary">Stock Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400 italic">Changing this will update all current items in the batch.</p>
                </div>

                {/* Warehouses Section */}
                <div className="pt-4 border-t space-y-4">
                  <div className="space-y-3">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                      {adjustmentType === 'transfer' ? 'Source Location' : 'Target Location'}
                    </Label>
                    <Select value={warehouseId} onValueChange={setWarehouseId}>
                      <SelectTrigger className="h-12 border-slate-200">
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map(w => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className={cn(
                      "text-[11px] font-black uppercase tracking-widest transition-colors",
                      adjustmentType === 'transfer' ? "text-primary" : "text-slate-300"
                    )}>
                      Transfer Destination
                    </Label>
                    <Select 
                      value={targetWarehouseId} 
                      onValueChange={setTargetWarehouseId}
                      disabled={adjustmentType !== 'transfer'}
                    >
                      <SelectTrigger className={cn(
                        "h-12 border-slate-200",
                        adjustmentType === 'transfer' && "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      )}>
                        <SelectValue placeholder={adjustmentType === 'transfer' ? "Select destination" : "N/A (Adjust Only)"} />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.filter(w => w.id !== warehouseId).map(w => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Reference & Supplier */}
                <div className="pt-4 border-t grid grid-cols-1 gap-4">
                  <div className="space-y-3">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Reference No.</Label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input 
                        placeholder="e.g., ADJ-10023" 
                        className="pl-10 h-12 border-slate-200"
                        value={referenceNo}
                        onChange={(e) => setReferenceNo(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Associated Supplier</Label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger className="h-12 border-slate-200">
                        <SelectValue placeholder="None / External" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {suppliers.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Final Notes */}
                <div className="pt-4 border-t space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Batch Memo / Reason</Label>
                  <Textarea 
                    placeholder="Provide context for this bulk operation..." 
                    className="min-h-[120px] border-slate-200 resize-none font-medium text-sm leading-relaxed"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="p-6 border-t bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.06)] flex flex-col gap-4 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
               <div className="flex flex-col">
                  <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Adjustment Summary</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-black text-slate-900">{adjustments.length}</span>
                    <span className="text-sm font-bold text-slate-400">Items Total</span>
                  </div>
               </div>
               <div className="h-12 w-px bg-slate-100" />
               <div className="flex flex-col">
                  <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Batch Scope Preview</span>
                  <div className="flex gap-3 mt-2">
                    {adjustments.filter(a => a.type === 'add').length > 0 && (
                      <Badge variant="outline" className="h-7 px-3 bg-green-50 text-green-700 border-green-100 font-bold gap-1.5">
                        <TrendingUp className="h-3 w-3" />
                        {adjustments.filter(a => a.type === 'add').length} In
                      </Badge>
                    )}
                    {adjustments.filter(a => a.type === 'remove').length > 0 && (
                      <Badge variant="outline" className="h-7 px-3 bg-red-50 text-red-700 border-red-100 font-bold gap-1.5">
                        <TrendingDown className="h-3 w-3" />
                        {adjustments.filter(a => a.type === 'remove').length} Out
                      </Badge>
                    )}
                    {adjustments.filter(a => a.type === 'transfer').length > 0 && (
                      <Badge variant="outline" className="h-7 px-3 bg-primary/5 text-primary border-primary/10 font-bold gap-1.5">
                        <Repeat className="h-3 w-3" />
                        {adjustments.filter(a => a.type === 'transfer').length} Xfer
                      </Badge>
                    )}
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" className="font-bold text-slate-500 px-8 h-14 hover:bg-slate-50" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleProcessAdjustments}
                disabled={adjustments.length === 0 || isProcessing || adjustments.some(a => (a.type === 'remove' || a.type === 'transfer' ? a.product.stock - a.quantity : a.product.stock + a.quantity) < 0)}
                className="h-14 px-10 font-black text-lg shadow-xl shadow-primary/30 transition-all active:scale-[0.98] bg-primary hover:bg-primary/90 min-w-[300px]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                    Executing Batch...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-3 h-6 w-6" />
                    Finalize {adjustments.length} Adjustments
                  </>
                )}
              </Button>
          </div>
        </div>
      </div>
    </SheetContent>
  </Sheet>
);
}
