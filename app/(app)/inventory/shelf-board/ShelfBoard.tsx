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
  SlidersHorizontal,
  PackageOpen,
  ArrowRight,
  Trash2,
  AlertCircle,
  ArrowRightLeft,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { Product, ShelfLocation } from '@/lib/types';
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
import { ManageShelfLocationsDialog } from '../../products/ManageShelfLocationsDialog';
import { updateProductShelfLocations } from '../../products/actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StockItem {
  uniqueId: string;
  product: Product;
  shelfId: string;
  shelfName: string;
  quantity: number;
}

interface StagedItem {
  stagedId: string;
  sourceUniqueId: string;
  product: Product;
  sourceShelfId: string;
  sourceShelfName: string;
  maxQuantity: number;
  transferQuantity: number;
}

export default function ShelfBoard() {
  const { toast } = useToast();
  const [shelfLocations, setShelfLocations] = useState<ShelfLocation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Left Pane: Source State
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourceShelfFilter, setSourceShelfFilter] = useState<string>('all');
  const [sourceCategoryFilter, setSourceCategoryFilter] = useState<string>('all');
  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<string>>(new Set());

  // Right Pane: Staging State
  const [targetShelfId, setTargetShelfId] = useState<string>('');
  const [stagedItems, setStagedItems] = useState<StagedItem[]>([]);
  
  const [isTransferring, setIsTransferring] = useState(false);
  const [user, setUser] = useState<{ uid: string; [key: string]: any } | null>(null);
  
  // Mobile UI Tabs
  const [activeTab, setActiveTab] = useState<string>('source');

  useEffect(() => {
    setMounted(true);
    fetchData();
    const userSession = localStorage.getItem('mock-user-session');
    if (userSession) {
      setUser(JSON.parse(userSession));
    }
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [shelfRes, prodRes] = await Promise.all([
        fetch(getApiUrl('/shelf-locations')),
        fetch(getApiUrl('/products?limit=1000')),
      ]);

      const shelfData = await shelfRes.json();
      const prodData = await prodRes.json();

      if (shelfData.success) setShelfLocations(shelfData.data);
      if (prodData.success) setProducts(prodData.data);
      
      setSelectedSourceIds(new Set()); 
      setStagedItems([]);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load board data.' });
    } finally {
      setIsLoading(false);
    }
  };

  const getUnassignedQty = (p: Product) => {
    return p.stock - Object.values(p.shelfQuantities || {}).reduce((a, b) => a + b, 0);
  };

  const allStockItems = useMemo<StockItem[]>(() => {
    return products.flatMap(p => {
      const items: StockItem[] = [];
      const unassignedQty = getUnassignedQty(p);
      
      if (unassignedQty > 0 || (p.stock <= 0 && Object.keys(p.shelfQuantities || {}).length === 0)) {
        items.push({
          uniqueId: `unassigned|${p.id}`,
          product: p,
          shelfId: 'unassigned',
          shelfName: 'Unassigned Shelf',
          quantity: unassignedQty > 0 ? unassignedQty : 0
        });
      }

      if (p.shelfQuantities) {
        Object.entries(p.shelfQuantities).forEach(([sId, qty]) => {
          if (qty > 0) {
            const shelfName = shelfLocations.find(s => s.id === sId)?.name || 'Unknown Shelf';
            items.push({
              uniqueId: `${sId}|${p.id}`,
              product: p,
              shelfId: sId,
              shelfName: shelfName,
              quantity: qty
            });
          }
        });
      }

      return items;
    });
  }, [products, shelfLocations]);

  const filteredSourceItems = useMemo(() => {
    return allStockItems.filter(item => {
      const nameMatch = (item.product.name || '').toLowerCase().includes(sourceSearch.toLowerCase());
      const skuMatch = (item.product.sku || '').toLowerCase().includes(sourceSearch.toLowerCase());
      const matchesSearch = nameMatch || skuMatch;
      
      const matchesCategory = sourceCategoryFilter === 'all' || item.product.category === sourceCategoryFilter;
      const matchesShelf = sourceShelfFilter === 'all' || item.shelfId === sourceShelfFilter;
      
      return matchesSearch && matchesCategory && matchesShelf && item.quantity > 0;
    }).sort((a, b) => a.product.name.localeCompare(b.product.name));
  }, [allStockItems, sourceSearch, sourceCategoryFilter, sourceShelfFilter]);

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  const toggleSourceSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newSelected = new Set(selectedSourceIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSourceIds(newSelected);
  };

  const stageSelectedItems = () => {
    if (selectedSourceIds.size === 0) {
        toast({ title: 'Selection Required', description: 'Please tap on items in the list to select them first.'});
        return;
    }
    const newStagedItems = [...stagedItems];
    let itemsAdded = 0;

    selectedSourceIds.forEach(id => {
      const sourceItem = allStockItems.find(i => i.uniqueId === id);
      if (!sourceItem) return;

      const existing = newStagedItems.find(s => s.sourceUniqueId === sourceItem.uniqueId);
      if (existing) return;

      newStagedItems.push({
        stagedId: crypto.randomUUID(),
        sourceUniqueId: sourceItem.uniqueId,
        product: sourceItem.product,
        sourceShelfId: sourceItem.shelfId,
        sourceShelfName: sourceItem.shelfName,
        maxQuantity: sourceItem.quantity,
        transferQuantity: sourceItem.quantity
      });
      itemsAdded++;
    });

    setStagedItems(newStagedItems);
    setSelectedSourceIds(new Set()); 
    
    if (itemsAdded > 0) {
      toast({
         title: "Items Staged",
         description: `Staged ${itemsAdded} item${itemsAdded > 1 ? 's' : ''} for transfer.`,
      });
      // Switch to staging tab on mobile
      setActiveTab('staging');
    }
  };

  const removeStagedItem = (stagedId: string) => {
    setStagedItems(prev => prev.filter(i => i.stagedId !== stagedId));
  };

  const updateStagedQuantity = (stagedId: string, val: number) => {
    setStagedItems(prev => prev.map(item => {
      if (item.stagedId === stagedId) {
        return { ...item, transferQuantity: Math.min(item.maxQuantity, Math.max(1, val)) };
      }
      return item;
    }));
  };

  const handleClearStaging = () => {
      setStagedItems([]);
  };

  const executeTransfer = async () => {
    if (!targetShelfId) {
      toast({ variant: 'destructive', title: 'Target Required', description: 'Please select a destination shelf.' });
      return;
    }

    if (stagedItems.length === 0) {
      toast({ variant: 'destructive', title: 'Empty Transfer', description: 'No items are staged for transfer.' });
      return;
    }
    
    const invalidItems = stagedItems.filter(item => item.sourceShelfId === targetShelfId);
    if (invalidItems.length > 0) {
        toast({ 
            variant: 'destructive', 
            title: 'Invalid Transfer', 
            description: `Some items are already on the destination shelf (${targetShelfId === 'unassigned' ? 'Unassigned' : shelfLocations.find(s => s.id === targetShelfId)?.name}). Please remove them from staging.` 
        });
        return;
    }

    setIsTransferring(true);
    try {
      const updates = stagedItems.map(item => ({
        productId: item.product.id,
        sourceShelfId: item.sourceShelfId === 'unassigned' ? null : item.sourceShelfId,
        targetShelfId: targetShelfId === 'unassigned' ? null : targetShelfId,
        quantity: item.transferQuantity
      }));

      const result = await updateProductShelfLocations(updates, user?.uid || 'system');

      if (result.success) {
        if ((result as any).pendingApproval) {
          toast({ title: "Approval Required", description: "Shelf transfer submitted for approval." });
        } else {
          toast({ title: "Transfer Successful", description: `Transferred ${stagedItems.length} items.` });
        }
        setTargetShelfId('');
        setActiveTab('source');
        fetchData();
      } else {
        throw new Error((result as any).message || 'Transfer failed');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Transfer Failed', description: error.message });
    } finally {
      setIsTransferring(false);
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-210px)] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
        <p className="text-muted-foreground animate-pulse">Loading workspace...</p>
      </div>
    );
  }

  // REUSABLE PANES
  // RENDER PANE HELPERS (inline them in the return for better state safety)
  const renderSourcePane = () => (
      <div className="flex-1 flex flex-col bg-background lg:border lg:rounded-3xl lg:shadow-md overflow-hidden h-full min-h-0">
         <div className="p-4 border-b bg-muted/30 backdrop-blur-sm shrink-0 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg flex items-center gap-2">
                   <Box className="w-5 h-5 text-muted-foreground" />
                   Source Inventory
                </h2>
                <div className="flex items-center gap-2">
                    <ManageShelfLocationsDialog 
                        onLocationAdded={fetchData}
                        trigger={
                            <Button variant="outline" size="sm" className="h-8 px-2 sm:px-3 gap-2 flex">
                                <Rows3 className="h-4 w-4 text-muted-foreground md:mr-1" />
                                <span className="hidden md:inline">Locations</span>
                            </Button>
                        }
                    />
                    <Button variant="outline" size="sm" onClick={fetchData} className="h-8 px-2 hidden sm:flex">
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                <div className="relative w-full">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search items..."
                        value={sourceSearch}
                        onChange={(e) => setSourceSearch(e.target.value)}
                        className="pl-9 h-10 w-full rounded-xl bg-background/50 border-muted-foreground/20 focus:bg-background transition-all"
                    />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                    <Select value={sourceShelfFilter} onValueChange={setSourceShelfFilter}>
                        <SelectTrigger className="w-full h-9">
                            <SelectValue placeholder="All Shelves" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="font-bold">All Shelves</SelectItem>
                            <SelectItem value="unassigned" className="text-orange-600">Unassigned</SelectItem>
                            {shelfLocations.map((s, idx) => <SelectItem key={`${s.id}-${idx}`} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    
                    <Select value={sourceCategoryFilter} onValueChange={setSourceCategoryFilter}>
                        <SelectTrigger className="w-full h-9">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="font-bold">All Categories</SelectItem>
                            {categories.map((c, idx) => <SelectItem key={`${c}-${idx}`} value={c!}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
         </div>

         {/* Source Items List */}
         <div className="flex bg-muted/40 px-4 py-2 border-b text-xs font-bold text-muted-foreground flex-none items-center gap-2">
             <Checkbox 
                id="select-all-source" 
                checked={filteredSourceItems.length > 0 && selectedSourceIds.size === filteredSourceItems.length}
                onCheckedChange={() => {
                   if (selectedSourceIds.size === filteredSourceItems.length) setSelectedSourceIds(new Set());
                   else setSelectedSourceIds(new Set(filteredSourceItems.map(i => i.uniqueId)));
                }}
             />
             <span className="flex-1 ml-2">Product Name</span>
             <span className="w-24 text-right">Available</span>
         </div>
         <ScrollArea className="flex-1 bg-background">
             {filteredSourceItems.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-40 text-muted-foreground opacity-60">
                     <PackageOpen className="h-8 w-8 mb-2" />
                     <p className="text-sm">No items found.</p>
                 </div>
             ) : (
                 <div className="p-3 space-y-3 pb-28 lg:pb-4">
                     {filteredSourceItems.map((item, idx) => {
                         const isSelected = selectedSourceIds.has(item.uniqueId);
                         const isAlreadyStaged = stagedItems.some(s => s.sourceUniqueId === item.uniqueId);
                         
                         return (
                             <div 
                                key={`${item.uniqueId}-${idx}`}
                                onClick={(e) => {
                                    if (!isAlreadyStaged) toggleSourceSelect(item.uniqueId, e as any);
                                }}
                                 className={cn(
                                     "flex items-center gap-3 p-4 transition-all duration-300 cursor-pointer border rounded-2xl shadow-sm bg-card/60 backdrop-blur-sm",
                                     isSelected && "bg-primary/5 border-primary shadow-[0_0_15px_-3px_rgba(var(--primary),0.2)]",
                                     isAlreadyStaged ? "opacity-50 cursor-not-allowed bg-muted/30" : "hover:border-primary/30 transform active:scale-[0.98] hover:shadow-md"
                                 )}
                             >
                                 <div className="shrink-0 flex items-center justify-center pt-1">
                                    <Checkbox 
                                        checked={isAlreadyStaged ? true : isSelected}
                                        disabled={isAlreadyStaged}
                                        onCheckedChange={() => toggleSourceSelect(item.uniqueId)}
                                        onClick={(e) => e.stopPropagation()}
                                        className={cn(isAlreadyStaged && "opacity-50")}
                                    />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                     <p className="text-sm font-semibold truncate leading-tight mb-1">{item.product.name}</p>
                                     <div className="flex items-center gap-2">
                                         <Badge variant="outline" className={cn("text-[10px] px-1.5 h-4", item.shelfId === 'unassigned' && "border-orange-200 text-orange-600")}>
                                             {item.shelfName}
                                         </Badge>
                                         <span className="text-[10px] text-muted-foreground font-mono">{item.product.sku}</span>
                                     </div>
                                 </div>
                                 <div className="w-20 text-right shrink-0">
                                     {isAlreadyStaged ? (
                                         <span className="text-xs font-bold text-primary flex justify-end"><CheckCircle2 className="w-4 h-4" /></span>
                                     ) : (
                                         <span className="text-sm font-black">{item.quantity}</span>
                                     )}
                                 </div>
                             </div>
                         );
                     })}
                 </div>
             )}
         </ScrollArea>
      </div>
  );

  const renderTargetPane = () => (
      <div className="flex-1 flex flex-col bg-background lg:border lg:rounded-3xl lg:shadow-md overflow-hidden h-full min-h-0">
         <div className="p-4 border-b bg-muted/30 backdrop-blur-sm shrink-0 space-y-4">
             <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg flex items-center gap-2 text-primary">
                   <ArrowRightLeft className="w-5 h-5" />
                   Transfer Destination
                </h2>
                {stagedItems.length > 0 && (
                   <Button variant="ghost" size="sm" onClick={handleClearStaging} className="h-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10">
                       Clear
                   </Button>
                )}
             </div>

             <div className="space-y-2">
                 <Label className="text-sm font-bold">Target Shelf Location</Label>
                 <Select value={targetShelfId} onValueChange={setTargetShelfId}>
                    <SelectTrigger className={cn("w-full h-12 text-base font-semibold rounded-xl ring-offset-background transition-all focus:ring-2", !targetShelfId ? "border-primary/50 bg-primary/5 shadow-[0_0_10px_-2px_rgba(var(--primary),0.1)]" : "bg-background")}>
                        <SelectValue placeholder="Required: Choose destination shelf..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="unassigned" className="font-medium text-orange-600">Unassigned / Return to pool</SelectItem>
                        {shelfLocations.map(s => <SelectItem key={s.id} value={s.id} className="font-medium">{s.name}</SelectItem>)}
                    </SelectContent>
                 </Select>
             </div>
          </div>

          <div className="flex bg-muted/40 px-4 py-2 border-b text-xs font-bold text-muted-foreground flex-none items-center justify-between">
              <span>Staged Items ({stagedItems.length})</span>
              <span className="pr-[4.5rem]">Transfer Qty</span>
          </div>

          <ScrollArea className="flex-1 bg-background/50">
              {stagedItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground opacity-60 px-6 text-center">
                      <AlertCircle className="h-10 w-10 mb-3 opacity-30" />
                      <p className="text-sm font-medium text-foreground">Staging Area Empty</p>
                      <p className="text-xs mt-1">Select items from the source pane and move them here to begin transfer.</p>
                  </div>
              ) : (
                  <div className="p-3 space-y-3 pb-28 lg:pb-3">
                      {stagedItems.map((item, idx) => (
                          <div key={`${item.stagedId}-${idx}`} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm group transform transition-all duration-300 hover:border-primary/30 hover:shadow-md">
                              <div className="flex-1 min-w-0 pr-2">
                                  <p className="font-bold text-sm text-foreground truncate">{item.product.name}</p>
                                  <div className="flex flex-col gap-0.5 mt-0.5">
                                      <span className="text-[10px] text-muted-foreground"><span className="opacity-70">From:</span> {item.sourceShelfName}</span>
                                      <span className="text-[10px] font-medium text-muted-foreground"><span className="opacity-70">Max Avail:</span> {item.maxQuantity}</span>
                                  </div>
                              </div>
                              
                              <div className="flex items-center gap-2 shrink-0">
                                  <div className="flex items-center gap-0 border rounded overflow-hidden bg-background">
                                      <Button 
                                          variant="ghost" size="icon" 
                                          className="h-8 w-8 rounded-none hover:bg-muted font-bold text-muted-foreground"
                                          onClick={() => updateStagedQuantity(item.stagedId, item.transferQuantity - 1)}
                                      >-</Button>
                                      <Input 
                                          type="number" min={1} max={item.maxQuantity}
                                          value={item.transferQuantity === undefined ? '' : item.transferQuantity}
                                          onChange={(e) => {
                                              let val = parseInt(e.target.value);
                                              if (isNaN(val)) val = 1;
                                              updateStagedQuantity(item.stagedId, val);
                                          }}
                                          className="h-8 w-14 text-center border-0 rounded-none focus-visible:ring-0 text-sm font-bold px-1"
                                      />
                                      <Button 
                                          variant="ghost" size="icon" 
                                          className="h-8 w-8 rounded-none hover:bg-muted font-bold text-muted-foreground"
                                          onClick={() => updateStagedQuantity(item.stagedId, item.transferQuantity + 1)}
                                      >+</Button>
                                  </div>
                                  <Button 
                                      variant="ghost" size="icon" 
                                      className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-50 xl:opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => removeStagedItem(item.stagedId)}
                                  >
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </ScrollArea>

          <div className="p-4 border-t bg-muted/10 shrink-0 hidden lg:flex items-center justify-between gap-4">
              <div className="text-sm">
                  <span className="text-muted-foreground">Total:</span> <span className="font-bold">{stagedItems.length} items</span>
              </div>
              <Button 
                  size="lg" 
                  disabled={isTransferring || stagedItems.length === 0 || !targetShelfId}
                  onClick={executeTransfer}
                  className="font-bold shadow-md"
              >
                  {isTransferring ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                  Confirm Transfer
              </Button>
          </div>
      </div>
  );

  return (
    <>
      {/* DESKTOP SPLIT VIEW */}
      <div className="hidden lg:flex h-full flex-row gap-4 relative">
        {renderSourcePane()}
        
        {/* MIDDLE ACTION STRIP */}
        <div className="flex flex-col items-center justify-center gap-4 py-0 shrink-0 border-x bg-muted/10 w-20">
            <Button 
                size="lg"
                disabled={selectedSourceIds.size === 0}
                onClick={stageSelectedItems}
                className={cn(
                    "rounded-full w-14 h-14 shadow-md transition-all font-bold", 
                    selectedSourceIds.size > 0 ? "scale-105 bg-primary hover:bg-primary/90" : "opacity-50"
                )}
            >
                <ArrowRight className="w-5 h-5" />
            </Button>
            
            {stagedItems.length > 0 && selectedSourceIds.size === 0 && (
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded">Staged</p>
            )}
        </div>
        
        {renderTargetPane()}
      </div>

      {/* MOBILE TABS VIEW */}
      <div className="flex lg:hidden flex-col h-full relative">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full w-full">
            <div className="px-4 pt-2">
                <TabsList className="grid w-full grid-cols-2 shrink-0 mb-2 h-14 bg-muted/60 p-1.5 rounded-2xl border border-white/10 shadow-inner">
                    <TabsTrigger value="source" className="text-sm font-bold rounded-xl flex gap-2 transition-all data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary h-full">
                        Source
                        {selectedSourceIds.size > 0 && <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center shadow-sm">{selectedSourceIds.size}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="staging" className="text-sm font-bold rounded-xl flex gap-2 transition-all data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary h-full">
                        Staging
                        {stagedItems.length > 0 && <Badge variant="default" className="bg-primary text-primary-foreground h-5 w-5 p-0 flex items-center justify-center shadow-sm">{stagedItems.length}</Badge>}
                    </TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="source" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden flex flex-col relative min-h-0">
                {renderSourcePane()}
                
                {/* Floating Mobile Action Dock */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-background/70 backdrop-blur-xl border-t z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.06)]">
                     <Button 
                         size="lg" 
                         disabled={false}
                         onClick={stageSelectedItems} 
                         className={cn(
                             "rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] font-bold w-full h-14 text-base gap-2 transition-all duration-300",
                             selectedSourceIds.size > 0 ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 transform active:scale-[0.98] border-none" : "bg-muted-foreground/80 text-background opacity-90 border-2 border-background"
                         )}
                     >
                         <ArrowRight className="w-5 h-5 flex-shrink-0" />
                         {selectedSourceIds.size > 0 ? `Stage ${selectedSourceIds.size} Items` : "Select Items to Stage"}
                     </Button>
                </div>
            </TabsContent>
            
            <TabsContent value="staging" className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden flex flex-col relative min-h-0">
                {renderTargetPane()}
                
                {/* Floating Mobile Confirm Dock */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-background/70 backdrop-blur-xl border-t z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.06)] lg:hidden">
                     <Button 
                         size="lg" 
                         disabled={isTransferring}
                         onClick={executeTransfer}
                         className={cn(
                             "rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] font-black w-full h-14 text-base transition-all duration-300", 
                             !targetShelfId || stagedItems.length === 0 ? "bg-muted-foreground/80 text-background opacity-90 border-2 border-background" : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90 transform active:scale-[0.98] border-none"
                         )}
                     >
                         {isTransferring ? (
                             <Loader2 className="h-5 w-5 animate-spin mr-2" />
                         ) : stagedItems.length === 0 ? (
                             <AlertCircle className="h-5 w-5 flex-shrink-0 mr-2" />
                         ) : (
                             <CheckCircle2 className="h-5 w-5 flex-shrink-0 mr-2" />
                         )}
                         {stagedItems.length === 0 ? "Staging Area Empty" : !targetShelfId ? "Pick Target Shelf" : "Confirm Transfer"}
                     </Button>
                </div>
            </TabsContent>
        </Tabs>
      </div>

    </>
  );
}
