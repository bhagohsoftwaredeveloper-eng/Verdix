'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  Search, Plus, Trash2, Package, ArrowRight,
  TrendingDown, TrendingUp, Loader2, Layers,
  CheckCircle2, Warehouse as WarehouseIcon,
  Tag, FileText, Repeat, SlidersHorizontal,
  X, ChevronDown, ChevronUp, PackagePlus
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Product, Warehouse, Supplier } from '@/lib/types';
import { getProducts } from '../../products/actions';
import { useToast } from '@/hooks/use-toast';
import { cn, formatQuantity } from '@/lib/utils';
import { dispatchStockUpdate } from '@/hooks/use-live-refresh';

interface AdjustmentItem {
  product: Product;
  quantity: number;
  type: 'add' | 'remove' | 'transfer';
  reason: string;
}

export default function BulkAdjustmentClient() {
  const router = useRouter();
  const { toast } = useToast();
  const searchRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove' | 'transfer'>('add');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState('');
  const [note, setNote] = useState('');

  const [adjustments, setAdjustments] = useState<AdjustmentItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Mobile: show config panel or list
  const [mobileView, setMobileView] = useState<'list' | 'config'>('list');
  // Mobile: show search overlay
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  useEffect(() => {
    loadProducts();
    loadMetadata();
  }, []);

  // Close search results when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
    try {
      const [whRes, supRes] = await Promise.all([
        fetch('/api/warehouses?activeOnly=true').then(r => r.json()),
        fetch('/api/suppliers').then(r => r.json())
      ]);
      if (whRes.success) setWarehouses(whRes.data);
      if (supRes.success) setSuppliers(supRes.data);
    } catch (error) {
      console.error('Failed to load metadata:', error);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return [];
    let filtered = allProducts;
    if (warehouseId && warehouseId !== 'none') {
      filtered = filtered.filter(p => p.warehouseId === warehouseId || p.warehouse === warehouseId);
    }
    return filtered.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 40);
  }, [allProducts, search, warehouseId]);

  const addProduct = (product: Product) => {
    if (adjustments.some(a => a.product.id === product.id)) {
      toast({ title: 'Already added', description: `${product.name} is already in the list.` });
      return;
    }
    setAdjustments(prev => [...prev, { product, quantity: 1, type: adjustmentType, reason: '' }]);
    setSearch('');
    setShowResults(false);
    setShowMobileSearch(false);
  };

  const removeAdjustment = (productId: string) => {
    setAdjustments(prev => prev.filter(a => a.product.id !== productId));
  };

  const updateAdjustment = (productId: string, updates: Partial<AdjustmentItem>) => {
    setAdjustments(prev => prev.map(a => a.product.id === productId ? { ...a, ...updates } : a));
  };

  const handleProcessAdjustments = async () => {
    if (adjustments.length === 0) return;
    if (adjustmentType === 'transfer' && !targetWarehouseId) {
      toast({ variant: 'destructive', title: 'Target Warehouse Required', description: 'Please select a destination warehouse.' });
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
          reason: a.reason || note || 'Bulk Stock Adjustment',
        })),
        notes: note || 'Bulk Stock Adjustment',
        userId, warehouseId, targetWarehouseId, referenceNo, supplierId, adjustmentType
      };
      const response = await fetch('/api/inventory/adjust/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: 'Bulk Adjustment Successful', description: `Processed ${result.processed} items.` });
        setAdjustments([]);
        dispatchStockUpdate();
        router.push('/inventory');
      } else {
        throw new Error(result.error || 'Failed to process adjustments');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Adjustment Failed', description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const typeConfig = {
    add:      { label: 'Add Stock',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: TrendingUp,   dot: 'bg-emerald-500' },
    remove:   { label: 'Remove Stock', color: 'bg-red-50 text-red-700 border-red-200',             icon: TrendingDown, dot: 'bg-red-500'     },
    transfer: { label: 'Transfer',    color: 'bg-blue-50 text-blue-700 border-blue-200',           icon: Repeat,       dot: 'bg-blue-500'   },
  };

  const hasNegativeStock = adjustments.some(a => {
    const newStock = a.type === 'remove' ? a.product.stock - a.quantity : a.product.stock + a.quantity;
    return newStock < 0;
  });

  // ── Search Results Dropdown ──────────────────────────────────────────────
  const SearchResultsDropdown = () => (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
      {isLoadingProducts ? (
        <div className="flex items-center justify-center py-8 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-slate-500">Loading catalog...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-8 text-center">
          <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-500">No products found</p>
          <p className="text-xs text-slate-400 mt-1">Try a different search term</p>
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
          {filteredProducts.map(p => (
            <button
              key={p.id}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors group"
              onMouseDown={(e) => { e.preventDefault(); addProduct(p); }}
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <Package className="h-4 w-4 text-slate-400 group-hover:text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-primary">{p.name}</p>
                <p className="text-xs text-slate-400 font-mono">{p.barcode || p.sku}</p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-bold h-5">
                  {formatQuantity(p.stock)} {p.unitOfMeasure}
                </Badge>
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // ── Config Form Fields ───────────────────────────────────────────────────
  const ConfigFields = ({ compact = false }: { compact?: boolean }) => (
    <div className={cn("space-y-5", compact && "space-y-4")}>
      {/* Adjustment Type */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Adjustment Mode</Label>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
          {(['add', 'remove', 'transfer'] as const).map(type => {
            const cfg = typeConfig[type];
            const Icon = cfg.icon;
            const isActive = adjustmentType === type;
            return (
              <button
                key={type}
                onClick={() => { setAdjustmentType(type); setAdjustments(prev => prev.map(a => ({ ...a, type }))); }}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all",
                  isActive ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive && (type === 'add' ? 'text-emerald-600' : type === 'remove' ? 'text-red-600' : 'text-blue-600'))} />
                {type === 'add' ? 'Add' : type === 'remove' ? 'Remove' : 'Transfer'}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400">Applies to all items in the batch</p>
      </div>

      {/* Warehouse */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {adjustmentType === 'transfer' ? 'Source Warehouse' : 'Warehouse'}
        </Label>
        <Select value={warehouseId} onValueChange={setWarehouseId}>
          <SelectTrigger className="h-10 border-slate-200 bg-white">
            <SelectValue placeholder="All warehouses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">All Warehouses</SelectItem>
            {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Transfer Destination */}
      {adjustmentType === 'transfer' && (
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-blue-600">Destination Warehouse</Label>
          <Select value={targetWarehouseId} onValueChange={setTargetWarehouseId}>
            <SelectTrigger className="h-10 border-blue-200 bg-blue-50/50 ring-1 ring-blue-100">
              <SelectValue placeholder="Select destination" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.filter(w => w.id !== warehouseId).map(w => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Reference No */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Reference No.</Label>
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="e.g. ADJ-10023"
            className="pl-9 h-10 border-slate-200 bg-white"
            value={referenceNo}
            onChange={e => setReferenceNo(e.target.value)}
          />
        </div>
      </div>

      {/* Supplier */}
      {suppliers.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Supplier (optional)</Label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger className="h-10 border-slate-200 bg-white">
              <SelectValue placeholder="None / External" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Memo */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Memo / Reason</Label>
        <Textarea
          placeholder="Reason for this batch adjustment..."
          className="min-h-[90px] border-slate-200 bg-white resize-none text-sm"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>
    </div>
  );

  // ── Empty State ───────────────────────────────────────────────────────────
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-6 py-12">
      <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
        <PackagePlus className="h-10 w-10 text-slate-300" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1">No items yet</h3>
      <p className="text-sm text-slate-500 max-w-xs">
        Search for products above to add them to this adjustment batch.
      </p>
    </div>
  );

  // ── Desktop Table Row ─────────────────────────────────────────────────────
  const DesktopTableRow = ({ adj }: { adj: AdjustmentItem }) => {
    const newStock = adj.type === 'remove' ? adj.product.stock - adj.quantity : adj.product.stock + adj.quantity;
    const isNegative = newStock < 0;
    const cfg = typeConfig[adj.type];
    const Icon = cfg.icon;

    return (
      <TableRow className="group hover:bg-slate-50/80 transition-colors border-b last:border-0">
        <TableCell className="py-4 pl-6">
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-sm text-slate-900 group-hover:text-primary transition-colors">
              {adj.product.name}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{adj.product.barcode || adj.product.sku}</span>
              {adj.product.warehouseName && (
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                  <WarehouseIcon className="h-3 w-3" />{adj.product.warehouseName}
                </span>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="py-4">
          <Badge variant="outline" className={cn("gap-1 font-semibold text-xs px-2.5 py-1 rounded-lg border", cfg.color)}>
            <Icon className="h-3 w-3" />
            {cfg.label}
          </Badge>
        </TableCell>
        <TableCell className="py-4">
          <div className="flex items-center gap-2 w-36">
            <button
              className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors"
              onClick={() => updateAdjustment(adj.product.id, { quantity: Math.max(1, adj.quantity - 1) })}
            >−</button>
            <Input
              type="number"
              min="1"
              className="h-8 w-14 text-center font-bold text-sm border-slate-200 px-1"
              value={adj.quantity}
              onChange={e => updateAdjustment(adj.product.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
            />
            <button
              className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors"
              onClick={() => updateAdjustment(adj.product.id, { quantity: adj.quantity + 1 })}
            >+</button>
          </div>
          <p className="text-[10px] text-slate-400 uppercase mt-1 pl-1">{adj.product.unitOfMeasure}</p>
        </TableCell>
        <TableCell className="py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-slate-500 tabular-nums">{formatQuantity(adj.product.stock)}</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            <span className={cn("text-sm font-bold tabular-nums", isNegative ? "text-red-600" : "text-emerald-600")}>
              {formatQuantity(newStock)}
            </span>
            {isNegative && (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 ml-0.5">Low</Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="py-4">
          <Input
            placeholder="Optional note..."
            className="h-8 text-xs border-slate-200 w-full min-w-[160px]"
            value={adj.reason}
            onChange={e => updateAdjustment(adj.product.id, { reason: e.target.value })}
          />
        </TableCell>
        <TableCell className="py-4 pr-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-lg"
            onClick={() => removeAdjustment(adj.product.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  // ── Mobile Card ───────────────────────────────────────────────────────────
  const MobileCard = ({ adj }: { adj: AdjustmentItem }) => {
    const newStock = adj.type === 'remove' ? adj.product.stock - adj.quantity : adj.product.stock + adj.quantity;
    const isNegative = newStock < 0;
    const cfg = typeConfig[adj.type];
    const Icon = cfg.icon;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="flex-1 min-w-0 pr-3">
            <p className="font-semibold text-sm text-slate-900 leading-snug">{adj.product.name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{adj.product.sku}</span>
              <Badge variant="outline" className={cn("text-[10px] font-semibold gap-1 h-4 px-1.5 border", cfg.color)}>
                <Icon className="h-2.5 w-2.5" />{cfg.label}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0 rounded-xl"
            onClick={() => removeAdjustment(adj.product.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Card Body */}
        <div className="px-4 py-3 space-y-3">
          {/* Quantity + Impact Row */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Quantity</p>
              <div className="flex items-center gap-2">
                <button
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-lg transition-colors"
                  onClick={() => updateAdjustment(adj.product.id, { quantity: Math.max(1, adj.quantity - 1) })}
                >−</button>
                <Input
                  type="number"
                  min="1"
                  className="h-8 w-16 text-center font-bold text-sm border-slate-200 px-1"
                  value={adj.quantity}
                  onChange={e => updateAdjustment(adj.product.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                />
                <button
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-lg transition-colors"
                  onClick={() => updateAdjustment(adj.product.id, { quantity: adj.quantity + 1 })}
                >+</button>
                <span className="text-[10px] text-slate-400 uppercase font-bold">{adj.product.unitOfMeasure}</span>
              </div>
            </div>

            {/* Stock Impact */}
            <div className="shrink-0 flex items-center gap-1.5 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
              <span className="text-sm font-mono text-slate-500">{formatQuantity(adj.product.stock)}</span>
              <ArrowRight className="h-3 w-3 text-slate-300" />
              <span className={cn("text-sm font-bold", isNegative ? "text-red-600" : "text-emerald-600")}>{formatQuantity(newStock)}</span>
            </div>
          </div>

          {/* Note */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Note (optional)</p>
            <Input
              placeholder="Reason for this item..."
              className="h-8 text-xs border-slate-200"
              value={adj.reason}
              onChange={e => updateAdjustment(adj.product.id, { reason: e.target.value })}
            />
          </div>
        </div>
      </div>
    );
  };

  // ── Footer Summary ────────────────────────────────────────────────────────
  const addCount = adjustments.filter(a => a.type === 'add').length;
  const removeCount = adjustments.filter(a => a.type === 'remove').length;
  const transferCount = adjustments.filter(a => a.type === 'transfer').length;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50">

      {/* ═══════════════════════ DESKTOP LAYOUT ═══════════════════════ */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">

        {/* Left: Product List */}
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r">
          {/* Search Bar */}
          <div className="px-6 py-4 border-b bg-white shrink-0">
            <div ref={searchRef} className="relative">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    placeholder="Search products by name or SKU..."
                    className="pl-10 h-11 border-slate-200 bg-slate-50 focus:bg-white transition-colors"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setShowResults(true); }}
                    onFocus={() => search.trim() && setShowResults(true)}
                  />
                  {search && (
                    <button onClick={() => { setSearch(''); setShowResults(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              {showResults && search.trim() && <SearchResultsDropdown />}
            </div>
          </div>

          {/* Table */}
          <ScrollArea className="flex-1">
            {adjustments.length === 0 ? (
              <EmptyState />
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 border-b">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6 py-3 text-xs font-bold uppercase tracking-widest text-slate-400 w-[280px]">Product</TableHead>
                    <TableHead className="py-3 text-xs font-bold uppercase tracking-widest text-slate-400">Type</TableHead>
                    <TableHead className="py-3 text-xs font-bold uppercase tracking-widest text-slate-400">Quantity</TableHead>
                    <TableHead className="py-3 text-xs font-bold uppercase tracking-widest text-slate-400">Impact</TableHead>
                    <TableHead className="py-3 text-xs font-bold uppercase tracking-widest text-slate-400">Note</TableHead>
                    <TableHead className="pr-4 py-3 w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.map(adj => <DesktopTableRow key={adj.product.id} adj={adj} />)}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </div>

        {/* Right: Config Sidebar */}
        <div className="w-[340px] shrink-0 bg-white flex flex-col">
          <div className="px-6 py-4 border-b flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Batch Configuration</h3>
              <p className="text-[11px] text-slate-400">Set options for this adjustment</p>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-6">
              <ConfigFields />
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* ═══════════════════════ MOBILE LAYOUT ═══════════════════════ */}
      <div className="flex md:hidden flex-1 flex-col min-h-0">

        {/* Mobile Header with Tabs */}
        <div className="bg-white border-b shrink-0">
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setMobileView('list')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors border-b-2",
                mobileView === 'list'
                  ? "text-primary border-primary bg-primary/5"
                  : "text-slate-500 border-transparent hover:text-slate-700"
              )}
            >
              <Package className="h-4 w-4" />
              Items
              {adjustments.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                  {adjustments.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileView('config')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors border-b-2",
                mobileView === 'config'
                  ? "text-primary border-primary bg-primary/5"
                  : "text-slate-500 border-transparent hover:text-slate-700"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Configure
            </button>
          </div>
        </div>

        {/* Mobile Items View */}
        {mobileView === 'list' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Search Bar */}
            <div className="px-4 py-3 bg-white border-b shrink-0">
              <div ref={searchRef} className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search products..."
                  className="pl-10 h-10 border-slate-200 bg-slate-50 pr-10"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowResults(true); }}
                  onFocus={() => search.trim() && setShowResults(true)}
                />
                {search ? (
                  <button onClick={() => { setSearch(''); setShowResults(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
                {showResults && search.trim() && <SearchResultsDropdown />}
              </div>
            </div>

            {/* Item Cards */}
            <div className="flex-1 overflow-y-auto">
              {adjustments.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="p-4 space-y-3 pb-4">
                  {adjustments.map(adj => <MobileCard key={adj.product.id} adj={adj} />)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Config View */}
        {mobileView === 'config' && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-1">
              <ConfigFields compact />
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════ FOOTER (both views) ══════════════════════ */}
      <div className="shrink-0 bg-white border-t shadow-[0_-2px_16px_rgba(0,0,0,0.06)]">
        {/* Summary pills - desktop only */}
        <div className="hidden md:flex items-center gap-3 px-6 pt-3 pb-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {adjustments.length} item{adjustments.length !== 1 ? 's' : ''} total
          </span>
          {addCount > 0 && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] gap-1">
              <TrendingUp className="h-3 w-3" /> {addCount} In
            </Badge>
          )}
          {removeCount > 0 && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[11px] gap-1">
              <TrendingDown className="h-3 w-3" /> {removeCount} Out
            </Badge>
          )}
          {transferCount > 0 && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] gap-1">
              <Repeat className="h-3 w-3" /> {transferCount} Transfer
            </Badge>
          )}
          {hasNegativeStock && (
            <Badge variant="destructive" className="text-[11px] ml-auto">
              ⚠ Negative stock detected
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 px-4 md:px-6 py-3">
          <Button
            variant="outline"
            className="h-11 font-semibold border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 md:w-auto w-1/3"
            onClick={() => router.push('/inventory')}
          >
            Cancel
          </Button>
          <Button
            className={cn(
              "h-11 font-bold flex-1 gap-2 transition-all",
              hasNegativeStock && "opacity-80"
            )}
            onClick={handleProcessAdjustments}
            disabled={adjustments.length === 0 || isProcessing || hasNegativeStock}
          >
            {isProcessing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
            ) : (
              <><CheckCircle2 className="h-4 w-4" /> Apply {adjustments.length > 0 ? adjustments.length : ''} Adjustment{adjustments.length !== 1 ? 's' : ''}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
