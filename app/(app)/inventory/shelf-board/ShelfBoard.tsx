'use client';

import { useState, useEffect } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
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
} from 'lucide-react';
import { Product, ShelfLocation } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
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

export default function ShelfBoard() {
  const { toast } = useToast();
  const [shelfLocations, setShelfLocations] = useState<ShelfLocation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'sku'>('name');
  const [isTransferring, setIsTransferring] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [pendingTransfer, setPendingTransfer] = useState<{
    products: Product[];
    sourceShelfId: string;
    targetShelfId: string;
  } | null>(null);
  const [user, setUser] = useState<{ uid: string; [key: string]: any } | null>(null);

  useEffect(() => {
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
        fetch(getApiUrl('/shelf-locations')), // Gets all shelf locations
        fetch(getApiUrl('/products?limit=1000')),
      ]);

      const shelfData = await shelfRes.json();
      const prodData = await prodRes.json();

      if (shelfData.success) setShelfLocations(shelfData.data);
      if (prodData.success) {
        // Find ones missing shelfLocationId from prodData...
        // Ensure they have shelfLocationId attached. The endpoint should return it if modified.
        setProducts(prodData.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load board data.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getUnassignedQty = (p: Product) => {
    return p.stock - Object.values(p.shelfQuantities || {}).reduce((a, b) => a + b, 0);
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    // draggableId is "shelfId|productId"
    const [sourceShelfId, draggedProductId] = draggableId.split('|');

    let selectedProducts: Product[] = [];
    if (selectedIds.has(draggableId)) {
        // Find all products whose unique instance (shelf|product) is selected
        const selectedForThisSource = Array.from(selectedIds)
            .filter(id => id.startsWith(`${source.droppableId}|`))
            .map(id => id.split('|')[1]);
            
        selectedProducts = products.filter(p => selectedForThisSource.includes(p.id));
    } else {
        const p = products.find(p => p.id === draggedProductId);
        if (p) selectedProducts = [p];
    }

    if (selectedProducts.length === 0) return;

    // Initialize transfer quantities with available amount in the specific source
    const initialQuantities: Record<string, number> = {};
    selectedProducts.forEach(p => {
        const available = source.droppableId === 'unassigned'
            ? getUnassignedQty(p)
            : (p.shelfQuantities?.[source.droppableId] || 0);
        initialQuantities[p.id] = available;
    });

    setPendingTransfer({
      products: selectedProducts,
      sourceShelfId: source.droppableId,
      targetShelfId: destination.droppableId,
      transferQuantities: initialQuantities
    } as any);
  };

  const handleTransferConfirm = async () => {
    if (!pendingTransfer) return;

    setIsTransferring(true);
    try {
      const sourceId = pendingTransfer.sourceShelfId === 'unassigned' ? null : pendingTransfer.sourceShelfId;
      const targetId = pendingTransfer.targetShelfId === 'unassigned' ? null : pendingTransfer.targetShelfId;
      
      const updates = pendingTransfer.products.map(p => ({
          productId: p.id,
          sourceShelfId: sourceId,
          targetShelfId: targetId,
          quantity: (pendingTransfer as any).transferQuantities?.[p.id] ?? p.stock
      }));

      const result = await updateProductShelfLocations(updates, user?.uid || 'system');

      if (result.success) {
        if ((result as any).pendingApproval) {
          toast({
            title: "Approval Required",
            description: "Shelf transfer has been submitted for multi-level approval.",
          });
        } else {
          toast({
            title: "Transfer successful",
            description: `Transferred stock to ${shelfLocations.find(s => s.id === targetId)?.name || 'Unassigned Shelf'}`
          });
        }
        setPendingTransfer(null);
        setSelectedIds(new Set());
        fetchData();
      } else {
        throw new Error((result as any).message || 'Transfer failed');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Transfer Failed',
        description: error.message,
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
        newSelected.delete(id);
    } else {
        newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const filteredProducts = products.filter((p) => {
    const nameMatch = (p.name || '').toLowerCase().includes(search.toLowerCase());
    const skuMatch = (p.sku || '').toLowerCase().includes(search.toLowerCase());
    const matchesSearch = nameMatch || skuMatch;
    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
    const matchesBrand = filterBrand === 'all' || p.brand === filterBrand;
    return matchesSearch && matchesCategory && matchesBrand;
  }).sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'sku') return (a.sku || '').localeCompare(b.sku || '');
      if (sortBy === 'stock') return b.stock - a.stock;
      return 0;
  });

  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  const brands = Array.from(new Set(products.map(p => p.brand).filter(Boolean)));

  const displayShelves = [
    ...(products.some(p => getUnassignedQty(p) !== 0) ? [{ id: 'unassigned', name: 'Unassigned Shelf' }] : []),
    ...shelfLocations
  ];

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-210px)] space-y-4">
      <div className="flex flex-wrap items-center gap-4 bg-background p-3 rounded-lg border shadow-sm shrink-0">
        <div className="flex items-center gap-2 w-full max-w-2xl min-w-[400px]">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, SKU or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              className="pl-8"
            />
          </div>
          <Button size="sm" onClick={fetchData} className="gap-2 shrink-0">
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>
        
        <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <Button variant="outline" size="sm" className="gap-2" asChild onClick={() => setIsFilterOpen(true)}>
            <button>
              <SlidersHorizontal className="h-4 w-4" />
              Filter
              {(filterCategory !== 'all' || filterBrand !== 'all' || sortBy !== 'name') && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {Number(filterCategory !== 'all') + Number(filterBrand !== 'all') + Number(sortBy !== 'name')}
                </Badge>
              )}
            </button>
          </Button>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Filter Products</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Brand</Label>
                <Select value={filterBrand} onValueChange={setFilterBrand}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {brands.map(b => <SelectItem key={b} value={b!}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Name" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Sort by Name</SelectItem>
                    <SelectItem value="sku">Sort by SKU</SelectItem>
                    <SelectItem value="stock">Sort by Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex justify-between sm:justify-between items-center sm:items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setFilterCategory('all');
                  setFilterBrand('all');
                  setSortBy('name');
                }}
                className="text-muted-foreground"
              >
                Clear All
              </Button>
              <Button onClick={() => setIsFilterOpen(false)}>Apply Filters</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex-1" />

        <ManageShelfLocationsDialog 
            onLocationAdded={fetchData}
            trigger={
                <Button variant="outline" size="sm" className="gap-2">
                    <Rows3 className="h-4 w-4" />
                    Manage Locations
                </Button>
            }
        />

        <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
           <RefreshCw className="h-4 w-4" />
           Refresh
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-6 overflow-x-auto pb-4 flex-1 min-h-0 items-start">
          {displayShelves.map((shelf) => (
            <div
              key={shelf.id}
              className={cn(
                "flex flex-col w-72 min-w-[280px] max-w-[280px] bg-muted/40 rounded-xl border-t-4 shadow-sm h-full max-h-full",
                shelf.id === 'unassigned' ? "border-t-orange-400" : "border-t-primary"
              )}
            >
              <div className="p-4 flex items-center justify-between border-b bg-background/50 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <Rows3 className={cn("h-5 w-5", shelf.id === 'unassigned' ? "text-orange-400" : "text-primary")} />
                  <h3 className="font-bold text-sm tracking-tight truncate">{shelf.name}</h3>
                </div>
                <Badge variant="secondary" className="font-mono">
                  {filteredProducts.filter(p => 
                    shelf.id === 'unassigned' 
                      ? getUnassignedQty(p) !== 0 
                      : (p.shelfQuantities?.[shelf.id] || 0) !== 0
                  ).length}
                </Badge>
              </div>

              <Droppable droppableId={shelf.id}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={cn(
                      "flex-1 p-3 space-y-3 overflow-y-auto transition-colors",
                      snapshot.isDraggingOver && "bg-primary/5 ring-2 ring-primary/20 ring-inset"
                    )}
                  >
                    {filteredProducts
                      .filter((p) => 
                        shelf.id === 'unassigned' 
                          ? getUnassignedQty(p) !== 0 
                          : (p.shelfQuantities?.[shelf.id] || 0) !== 0
                      )
                      .map((product, index) => {
                          const shelfQty = shelf.id === 'unassigned' 
                            ? getUnassignedQty(product)
                            : (product.shelfQuantities?.[shelf.id] || 0);
                          
                          const uniqueId = `${shelf.id}|${product.id}`;
                          
                          return (
                            <Draggable
                              key={uniqueId}
                              draggableId={uniqueId}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={provided.draggableProps.style}
                                  className={cn(
                                    "group bg-background rounded-lg border p-3 shadow-sm hover:shadow-md hover:border-primary/50 transition-all relative",
                                    snapshot.isDragging && "ring-2 ring-primary shadow-lg scale-105 rotate-2 z-50",
                                    selectedIds.has(uniqueId) && "ring-2 ring-primary bg-primary/[0.02]",
                                    product.stock <= 0 && "opacity-60 grayscale-[0.5]"
                                  )}
                                  onClick={(e) => toggleSelect(uniqueId, e)}
                                >
                                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <Checkbox 
                                        checked={selectedIds.has(uniqueId)}
                                        onCheckedChange={() => toggleSelect(uniqueId)} 
                                    />
                                  </div>

                                  <div className="flex justify-between items-start mb-2 pr-6">
                                    <h4 className="font-bold text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                      {product.name}
                                    </h4>
                                    <Badge 
                                        variant={shelfQty > 0 ? (shelfQty < (product.reorderPoint || 10) ? "secondary" : "default") : "destructive"} 
                                        className="h-5 px-1.5 text-[10px] shrink-0"
                                    >
                                      {shelfQty}
                                    </Badge>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap gap-1.5">
                                        {product.sku && (
                                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                            {product.sku}
                                        </span>
                                        )}
                                        {product.brand && (
                                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                                            {product.brand}
                                        </span>
                                        )}
                                        {product.category && (
                                        <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-medium">
                                            {product.category}
                                        </span>
                                        )}
                                    </div>
                                    
                                    <div className="pt-1">
                                        <Progress 
                                            value={Math.min(100, (shelfQty / ((product.reorderPoint || 10) * 2)) * 100)} 
                                            className="h-1" 
                                        />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}

          {displayShelves.length === 0 && (
            <div className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-xl border-muted text-muted-foreground">
              <Box className="h-12 w-12 mb-2 opacity-20" />
              <p>No active shelves found</p>
            </div>
          )}
        </div>
      </DragDropContext>

      <Dialog open={!!pendingTransfer} onOpenChange={(open) => !open && !isTransferring && setPendingTransfer(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Confirm Shelf Transfer</DialogTitle>
            <DialogDescription>
              Transferring stock from <strong>{pendingTransfer?.sourceShelfId === 'unassigned' ? 'Unassigned' : shelfLocations.find(s => s.id === pendingTransfer?.sourceShelfId)?.name}</strong> to <strong>{pendingTransfer?.targetShelfId === 'unassigned' ? 'Unassigned' : shelfLocations.find(s => s.id === pendingTransfer?.targetShelfId)?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4 -mr-4 my-4">
            <div className="space-y-4">
                {pendingTransfer?.products.map(product => {
                    const maxQty = pendingTransfer.sourceShelfId === 'unassigned'
                      ? getUnassignedQty(product)
                      : (product.shelfQuantities?.[pendingTransfer.sourceShelfId] || 0);

                    return (
                        <div key={product.id} className="p-4 bg-muted/30 rounded-lg border space-y-3">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm truncate">{product.name}</p>
                                    <p className="text-xs text-muted-foreground">Available in source: {maxQty}</p>
                                </div>
                                <div className="w-32">
                                    <Label htmlFor={`qty-${product.id}`} className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Quantity</Label>
                                    <Input 
                                        id={`qty-${product.id}`}
                                        type="number" 
                                        size={1}
                                        min={1} 
                                        max={maxQty}
                                        value={(pendingTransfer as any).transferQuantities?.[product.id] ?? maxQty}
                                        onChange={(e) => {
                                            const val = Math.min(maxQty, Math.max(1, parseInt(e.target.value) || 0));
                                            setPendingTransfer(prev => prev ? ({
                                                ...prev,
                                                transferQuantities: {
                                                    ...((prev as any).transferQuantities || {}),
                                                    [product.id]: val
                                                }
                                            } as any) : null);
                                        }}
                                        className="h-8 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
          </ScrollArea>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setPendingTransfer(null)} disabled={isTransferring}>Cancel</Button>
            <Button onClick={handleTransferConfirm} disabled={isTransferring}>
              {isTransferring && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Transfer {pendingTransfer?.products.length} Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
