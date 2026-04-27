'use client';

import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Box,
  Rows3,
  Loader2,
  RefreshCw,
  PackageOpen,
  ArrowRight,
  Trash2,
  AlertCircle,
  ArrowRightLeft,
  CheckCircle2,
  Warehouse as WarehouseIcon
} from 'lucide-react';
import { Product, Warehouse } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getApiUrl } from '@/lib/api-config';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ManageWarehousesDialog } from '../../sales/ManageWarehousesDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { v4 as uuidv4 } from 'uuid';

interface WarehouseStockItem {
  uniqueId: string;
  product: Product;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
}

interface StagedTransferItem {
  stagedId: string;
  sourceUniqueId: string;
  product: Product;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  maxQuantity: number;
  transferQuantity: number;
}

export function TransferBoard() {
  const { toast } = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  const [sourceSearch, setSourceSearch] = useState('');
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>('');
  const [stagedItems, setStagedItems] = useState<StagedTransferItem[]>([]);
  const [isTransferring, setIsTransferring] = useState(false);
  const [user, setUser] = useState<{ uid: string; [key: string]: any } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('source');

  useEffect(() => {
    setMounted(true);
    fetchData();
    const userSession = localStorage.getItem('mock-user-session');
    if (userSession) setUser(JSON.parse(userSession));
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [whRes, prodRes] = await Promise.all([
        fetch(getApiUrl('/warehouses?activeOnly=true')),
        fetch(getApiUrl('/products?limit=1000')),
      ]);
      const whData = await whRes.json();
      const prodData = await prodRes.json();
      if (whData.success) setWarehouses(whData.data);
      if (prodData.success) setProducts(prodData.data);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load board data.' });
    } finally {
      setIsLoading(false);
    }
  };

  const allStockItems = useMemo<WarehouseStockItem[]>(() => {
    return products.map(p => {
      const whId = p.warehouseId || (p as any).warehouse || 'unassigned';
      const whName = warehouses.find(w => w.id === whId)?.name || (whId === 'unassigned' ? 'Unassigned' : 'Unknown');
      
      return {
        uniqueId: `${whId}|${p.id}`,
        product: p,
        warehouseId: whId,
        warehouseName: whName,
        quantity: p.stock || 0
      };
    });
  }, [products, warehouses]);

  const filteredSourceItems = useMemo(() => {
    return allStockItems.filter(i => {
      const term = sourceSearch.toLowerCase();
      // Only show items with stock
      return (i.product.name?.toLowerCase().includes(term) || i.product.sku?.toLowerCase().includes(term)) && i.quantity > 0;
    }).sort((a, b) => a.product.name.localeCompare(b.product.name));
  }, [allStockItems, sourceSearch]);

  const stageItems = (ids: Set<string> | string) => {
    const list = typeof ids === 'string' ? [ids] : Array.from(ids);
    const newStaged = [...stagedItems];
    let addedCount = 0;

    list.forEach(id => {
      const item = allStockItems.find(i => i.uniqueId === id);
      if (!item || newStaged.some(s => s.sourceUniqueId === item.uniqueId)) return;
      newStaged.push({
        stagedId: uuidv4(),
        sourceUniqueId: item.uniqueId,
        product: item.product,
        sourceWarehouseId: item.warehouseId,
        sourceWarehouseName: item.warehouseName,
        maxQuantity: item.quantity,
        transferQuantity: item.quantity
      });
      addedCount++;
    });

    if (addedCount > 0) {
      setStagedItems(newStaged);
      if (typeof ids !== 'string') setSelectedSourceIds(new Set());
      toast({ title: "Items Staged", description: `Added ${addedCount} item(s) to transfer list.` });
      setActiveTab('staging');
    }
  };

  const executeTransfer = async () => {
    if (!targetWarehouseId || stagedItems.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a destination warehouse.' });
      return;
    }

    // Validation: cannot transfer to same warehouse
    if (stagedItems.some(i => i.sourceWarehouseId === targetWarehouseId)) {
        toast({ variant: 'destructive', title: 'Invalid Transfer', description: 'Some items are already in the target warehouse.' });
        return;
    }

    setIsTransferring(true);
    try {
      const transfers = stagedItems.map(i => ({
        sourceProductId: i.product.id,
        targetWarehouseId: targetWarehouseId === 'unassigned' ? null : targetWarehouseId,
        quantity: i.transferQuantity,
        notes: 'Warehouse Board Transfer'
      }));

      const response = await fetch(getApiUrl('/inventory/transfer/bulk'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transfers }),
      });

      const result = await response.json();

      if (result.success) {
        toast({ title: "Success", description: "Warehouse transfer completed successfully." });
        setTargetWarehouseId('');
        setActiveTab('source');
        setStagedItems([]);
        fetchData();
      } else {
        throw new Error(result.error || 'Transfer failed');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || "Failed to execute transfer." });
    } finally {
      setIsTransferring(false);
    }
  };

  if (!mounted || isLoading) return <div className="p-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>;

  const SourcePane = (
      <div className="flex flex-col h-full w-full bg-background min-h-0">
          <div className="p-3 border-b space-y-2 shrink-0">
              <div className="flex items-center justify-between gap-2">
                  <h2 className="font-bold text-sm flex items-center gap-1.5 truncate"><Box className="h-4 w-4" /> Stock Pool</h2>
                  <div className="flex gap-1">
                      <Button size="sm" className="h-7 text-[11px] font-bold" onClick={() => stageItems(selectedSourceIds)} disabled={selectedSourceIds.size === 0}>Stage Selected</Button>
                      <ManageWarehousesDialog onChange={fetchData} trigger={<Button variant="outline" size="sm" className="h-7 px-1.5"><Rows3 className="h-4 w-4" /></Button>} />
                  </div>
              </div>
              <Input placeholder="Search name or SKU..." value={sourceSearch} onChange={e => setSourceSearch(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-[36px,1fr,56px] px-3 py-1 bg-muted/30 border-b text-[10px] font-bold text-muted-foreground uppercase">
              <div className="flex justify-center"><Checkbox checked={filteredSourceItems.length > 0 && selectedSourceIds.size === filteredSourceItems.length} onCheckedChange={() => setSelectedSourceIds(selectedSourceIds.size === filteredSourceItems.length ? new Set() : new Set(filteredSourceItems.map(i => i.uniqueId)))} /></div>
              <span>Product</span>
              <span className="text-right">Stock</span>
          </div>
          <ScrollArea className="flex-1">
              <div className="p-1.5 space-y-1">
                  {filteredSourceItems.map(item => (
                      <div key={item.uniqueId} className={cn("grid grid-cols-[36px,1fr,60px] items-center gap-2 p-2 rounded-lg border", selectedSourceIds.has(item.uniqueId) ? "bg-primary/5 border-primary" : "bg-card")}>
                          <div className="flex justify-center"><Checkbox checked={selectedSourceIds.has(item.uniqueId)} onCheckedChange={() => { const s = new Set(selectedSourceIds); if (s.has(item.uniqueId)) s.delete(item.uniqueId); else s.add(item.uniqueId); setSelectedSourceIds(s); }} /></div>
                          <div className="min-w-0" onClick={() => stageItems(item.uniqueId)}>
                              <p className="text-xs font-bold truncate leading-tight">{item.product.name}</p>
                              <div className="flex items-center gap-1.5 opacity-70"><Badge variant="outline" className="text-[9px] px-1 h-3.5 truncate max-w-[80px]">{item.warehouseName}</Badge><span className="text-[9px] truncate font-mono">{item.product.sku}</span></div>
                          </div>
                          <div className="flex justify-end"><Button variant="ghost" size="sm" className="h-8 px-1.5 text-xs font-black" onClick={(e) => { e.stopPropagation(); stageItems(item.uniqueId); }}>{item.quantity}</Button></div>
                      </div>
                  ))}
                  {filteredSourceItems.length === 0 && <div className="py-20 text-center text-xs text-muted-foreground opacity-50">No products found</div>}
              </div>
          </ScrollArea>
      </div>
  );

  const TargetPane = (
      <div className="flex flex-col h-full w-full bg-background min-h-0 relative">
          <div className="p-3 border-b space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                  <h2 className="font-bold text-sm flex items-center gap-1.5 text-primary"><ArrowRightLeft className="h-4 w-4" /> Transfer Destination</h2>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] text-destructive uppercase font-bold" onClick={() => setStagedItems([])}>Clear All</Button>
              </div>
              <Select value={targetWarehouseId} onValueChange={setTargetWarehouseId}>
                  <SelectTrigger className={cn("h-9 text-xs font-bold transition-all", !targetWarehouseId ? "border-primary/50 bg-primary/5" : "bg-card")}>
                      <SelectValue placeholder="Select Destination Warehouse..." />
                  </SelectTrigger>
                  <SelectContent><SelectItem value="unassigned" className="text-orange-600 font-bold">Unassigned/Returns</SelectItem>{warehouses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
          </div>
          <div className="flex justify-between px-3 py-1 bg-muted/30 border-b text-[10px] font-bold text-muted-foreground uppercase"><span>Staged ({stagedItems.length})</span><span>Move Qty</span></div>
          <ScrollArea className="flex-1">
              <div className="p-1.5 space-y-1 pb-4">
                  {stagedItems.map(item => (
                      <div key={item.stagedId} className="flex items-center justify-between gap-2 p-2 border rounded-lg bg-card">
                          <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold truncate leading-tight">{item.product.name}</p>
                              <p className="text-[9px] opacity-60 truncate">From: {item.sourceWarehouseName} | Max: {item.maxQuantity}</p>
                          </div>
                          <div className="flex items-center gap-1">
                              <Input type="number" value={item.transferQuantity} onChange={e => { const v = parseInt(e.target.value) || 1; setStagedItems(prev => prev.map(i => i.stagedId === item.stagedId ? { ...i, transferQuantity: Math.min(i.maxQuantity, Math.max(1, v)) } : i)); }} className="h-7 w-12 text-center text-xs p-1" />
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setStagedItems(prev => prev.filter(i => i.stagedId !== item.stagedId))}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                      </div>
                  ))}
                  {stagedItems.length === 0 && <div className="py-20 text-center text-xs opacity-40">Staging empty</div>}
              </div>
          </ScrollArea>
          <div className="p-3 border-t bg-background/80 backdrop-blur shrink-0">
               <Button 
                className="w-full h-11 font-black shadow-lg shadow-primary/20" 
                disabled={!targetWarehouseId || stagedItems.length === 0 || isTransferring} 
                onClick={executeTransfer}
               >
                 {isTransferring ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                 Confirm Transfer
               </Button>
          </div>
      </div>
  );

  return (
      <div className="flex flex-col h-full w-full overflow-hidden">
          <div className="hidden lg:grid grid-cols-2 gap-6 h-full p-4">
              <div className="border rounded-2xl overflow-hidden shadow-sm">{SourcePane}</div>
              <div className="border rounded-2xl overflow-hidden shadow-sm">{TargetPane}</div>
          </div>
          <div className="flex lg:hidden flex-col h-full w-full overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full w-full">
                  <div className="px-3 pt-2 shrink-0"><TabsList className="grid grid-cols-2 w-full h-10 p-1 bg-muted/60 rounded-lg"><TabsTrigger value="source" className="text-xs font-bold">Stock Pool {stagedItems.length > 0 && `(${stagedItems.length})`}</TabsTrigger><TabsTrigger value="staging" className="text-xs font-bold">Staging Area</TabsTrigger></TabsList></div>
                  <TabsContent value="source" className="flex-1 m-0 min-h-0 data-[state=active]:flex flex-col">{SourcePane}</TabsContent>
                  <TabsContent value="staging" className="flex-1 m-0 min-h-0 data-[state=active]:flex flex-col relative">
                      {TargetPane}
                  </TabsContent>
              </Tabs>
          </div>
      </div>
  );
}
