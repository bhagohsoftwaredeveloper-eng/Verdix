'use client';

import { useState, useEffect } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Box,
  Warehouse as WarehouseIcon,
  ArrowRight,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { Product, Warehouse } from '@/lib/types';
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
import { ManageWarehousesDialog } from '../../sales/ManageWarehousesDialog';

interface TransferPayload {
  sourceProductId: string;
  targetWarehouseId: string;
  quantity: number;
}

export function TransferBoard() {
  const { toast } = useToast();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'sku'>('name');
  const [isTransferring, setIsTransferring] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Transfer selection state
  const [pendingTransfer, setPendingTransfer] = useState<{
    products: Product[];
    sourceWhId: string;
    targetWhId: string;
  } | null>(null);
  const [transferQtys, setTransferQtys] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData();
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

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;
    if (destination.droppableId === 'unassigned') {
        toast({
            variant: 'destructive',
            title: 'Invalid Transfer',
            description: 'You cannot transfer products back to the "Unassigned" list. Please move them to a warehouse.',
        });
        return;
    }

    // Use selection if the dragged item is part of it
    let selectedProducts: Product[] = [];
    if (selectedIds.has(draggableId)) {
        selectedProducts = products.filter(p => selectedIds.has(p.id));
    } else {
        const p = products.find(p => p.id === draggableId);
        if (p) selectedProducts = [p];
    }

    if (selectedProducts.length === 0) return;

    // Trigger transfer dialog
    setPendingTransfer({
      products: selectedProducts,
      sourceWhId: source.droppableId,
      targetWhId: destination.droppableId,
    });
    
    const initialQtys: Record<string, number> = {};
    selectedProducts.forEach(p => initialQtys[p.id] = 1);
    setTransferQtys(initialQtys);
  };

  const handleTransferConfirm = async () => {
    if (!pendingTransfer || Object.keys(transferQtys).length === 0) return;

    setIsTransferring(true);
    try {
      const transfers = pendingTransfer.products.map(p => ({
          sourceProductId: p.id,
          targetWarehouseId: pendingTransfer.targetWhId,
          quantity: transferQtys[p.id] || 0,
          notes: 'Transfer via Kanban Board'
      })).filter(t => t.quantity > 0);

      if (transfers.length === 0) {
          throw new Error('Please enter quantities for at least one item');
      }

      const response = await fetch(getApiUrl('/inventory/transfer/bulk'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transfers }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Transfers Completed',
          description: `Successfully moved ${transfers.length} item(s).`,
        });
        setPendingTransfer(null);
        setSelectedIds(new Set());
        fetchData(); // Refresh board
      } else {
        throw new Error(result.error || 'Transfer failed');
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

  // Add a virtual "Unassigned" warehouse if there are products with no warehouse
  const displayWarehouses = [
    ...(products.some(p => !(p.warehouseId || p.warehouse)) ? [{ id: 'unassigned', name: 'Unassigned Products' }] : []),
    ...warehouses
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
              <DialogDescription>
                Adjust the filters below to refine the product list.
              </DialogDescription>
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
              <DialogFooter>
                <Button onClick={() => setIsFilterOpen(false)}>Apply Filters</Button>
              </DialogFooter>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex-1" />

        <ManageWarehousesDialog 
            onChange={fetchData}
            trigger={
                <Button variant="outline" size="sm" className="gap-2">
                    <WarehouseIcon className="h-4 w-4" />
                    Manage Warehouses
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
          {displayWarehouses.map((warehouse) => (
            <div
              key={warehouse.id}
              className={cn(
                "flex flex-col w-72 min-w-[280px] max-w-[280px] bg-muted/40 rounded-xl border-t-4 shadow-sm h-full max-h-full",
                warehouse.id === 'unassigned' ? "border-t-orange-400" : "border-t-primary"
              )}
            >
              <div className="p-4 flex items-center justify-between border-b bg-background/50 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <WarehouseIcon className={cn("h-5 w-5", warehouse.id === 'unassigned' ? "text-orange-400" : "text-primary")} />
                  <h3 className="font-bold text-sm tracking-tight truncate">{warehouse.name}</h3>
                </div>
                <Badge variant="secondary" className="font-mono">
                  {filteredProducts.filter(p => {
                    const pWhId = p.warehouseId || p.warehouse;
                    return warehouse.id === 'unassigned' ? !pWhId : pWhId === warehouse.id;
                  }).length}
                </Badge>
              </div>

              <Droppable droppableId={warehouse.id} isDropDisabled={warehouse.id === 'unassigned'}>
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
                      .filter((p) => {
                        const pWhId = p.warehouseId || p.warehouse;
                        return warehouse.id === 'unassigned' ? !pWhId : pWhId === warehouse.id;
                      })
                      .map((product, index) => (
                        <Draggable
                          key={product.id}
                          draggableId={product.id}
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
                                selectedIds.has(product.id) && "ring-2 ring-primary bg-primary/[0.02]",
                                product.stock <= 0 && "opacity-60 grayscale-[0.5]"
                              )}
                              onClick={(e) => toggleSelect(product.id, e)}
                            >
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <Checkbox 
                                    checked={selectedIds.has(product.id)}
                                    onCheckedChange={() => toggleSelect(product.id)} 
                                />
                              </div>

                              <div className="flex justify-between items-start mb-2 pr-6">
                                <h4 className="font-bold text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                  {product.name}
                                </h4>
                                <Badge 
                                    variant={product.stock > 0 ? (product.stock < (product.reorderPoint || 10) ? "secondary" : "default") : "destructive"} 
                                    className="h-5 px-1.5 text-[10px] shrink-0"
                                >
                                  {product.stock}
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
                                        value={Math.min(100, (product.stock / ((product.reorderPoint || 10) * 2)) * 100)} 
                                        className="h-1" 
                                    />
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}

          {/* Empty state if no warehouses */}
          {warehouses.length === 0 && (
            <div className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-xl border-muted text-muted-foreground">
              <Box className="h-12 w-12 mb-2 opacity-20" />
              <p>No active warehouses found</p>
            </div>
          )}
        </div>
      </DragDropContext>

      {/* Transfer Confirmation Dialog */}
      <Dialog open={!!pendingTransfer} onOpenChange={(open) => !open && setPendingTransfer(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Confirm Batch Transfer</DialogTitle>
            <DialogDescription>
              Moving <strong>{pendingTransfer?.products.length}</strong> items to <strong>{pendingTransfer?.targetWhId === 'unassigned' ? 'Unassigned' : warehouses.find(w => w.id === pendingTransfer?.targetWhId)?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4 -mr-4 my-4">
            <div className="space-y-4">
                {pendingTransfer?.products.map(product => (
                    <div key={product.id} className="p-4 bg-muted/30 rounded-lg border flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">Available: {product.stock} {product.unitOfMeasure}</p>
                        </div>
                        <div className="flex items-center gap-2 w-48">
                            <Input
                                type="number"
                                min="0"
                                max={product.stock}
                                value={transferQtys[product.id] || 0}
                                onChange={(e) => setTransferQtys(prev => ({ 
                                    ...prev, 
                                    [product.id]: Math.min(product.stock, Number(e.target.value)) 
                                }))}
                                className="h-8 text-right"
                            />
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 px-2 text-[10px] uppercase font-bold"
                                onClick={() => setTransferQtys(prev => ({ ...prev, [product.id]: product.stock }))}
                            >
                                Max
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
          </ScrollArea>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setPendingTransfer(null)}>Cancel</Button>
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

