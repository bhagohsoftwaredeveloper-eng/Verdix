'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveRefresh, dispatchStockUpdate } from '@/hooks/use-live-refresh';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import {
  Plus, Eye, Play, Check, ChevronsUpDown, X,
  Calendar, MapPin, User, ClipboardList,
  ChevronRight, ChevronLeft, Search,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/client-activity-logger';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';

// ─── Status helpers ────────────────────────────────────────────────────────────
function statusClass(status: string) {
  if (status === 'completed')
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (status === 'cancelled')
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
}

function LocationLabel({ count }: { count: any }) {
  if (!count.warehouseName && !count.shelfName && !count.shelfNames?.length)
    return <span>Global</span>;
  return (
    <span className="flex flex-col text-xs gap-0.5">
      {count.warehouseName && <span>WH: {count.warehouseName}</span>}
      {count.shelfName && <span>Shelf: {count.shelfName}</span>}
      {count.shelfNames?.length > 0 && (
        <span className="truncate max-w-[180px]" title={count.shelfNames.join(', ')}>
          Shelves: {count.shelfNames.join(', ')}
        </span>
      )}
    </span>
  );
}

// ─── Mobile Card ───────────────────────────────────────────────────────────────
function StockCountCard({ count, onOpen }: { count: any; onOpen: (id: string) => void }) {
  return (
    <div
      onClick={() => onOpen(count.id)}
      className="group relative bg-card border border-border rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all duration-150 cursor-pointer hover:shadow-md hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardList className="h-4 w-4 text-primary" />
          </div>
          <p className="font-semibold text-sm leading-tight truncate">{count.name}</p>
        </div>
        <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide ${statusClass(count.status)}`}>
          {count.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs text-muted-foreground mb-4">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{count.createdAt ? format(new Date(count.createdAt), 'MMM d, yyyy') : 'N/A'}</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate"><LocationLabel count={count} /></span>
        </div>
        <div className="flex items-center gap-1.5 col-span-2">
          <User className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{count.createdBy}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/60">
        <span className="text-xs text-muted-foreground">
          {count.status === 'in_progress' ? 'Resume counting' : 'View report'}
        </span>
        <div className="flex items-center gap-1 text-primary text-xs font-medium">
          {count.status === 'in_progress'
            ? <><Play className="h-3.5 w-3.5" /><span>Continue</span></>
            : <><Eye className="h-3.5 w-3.5" /><span>View</span></>}
          <ChevronRight className="h-3.5 w-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 animate-pulse space-y-3">
      <div className="flex justify-between">
        <div className="h-4 w-40 bg-muted rounded" />
        <div className="h-5 w-20 bg-muted rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-3 w-28 bg-muted rounded" />
        <div className="h-3 w-24 bg-muted rounded" />
        <div className="h-3 w-32 col-span-2 bg-muted rounded" />
      </div>
      <div className="h-px bg-muted" />
      <div className="h-3 w-20 bg-muted rounded ml-auto" />
    </div>
  );
}

// ─── Pagination ────────────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

function Pagination({
  total, page, pageSize, onPageChange, onPageSizeChange,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 4) pages.push('ellipsis');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 3) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 select-none">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{total === 0 ? 'No results' : `${from}–${to} of ${total}`}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs hidden sm:inline">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
            className="h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {getPageNumbers().map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`e-${idx}`} className="h-8 w-8 flex items-center justify-center text-muted-foreground text-sm">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`inline-flex items-center justify-center h-8 w-8 rounded-md border text-sm transition-colors ${
                p === page
                  ? 'border-primary bg-primary text-primary-foreground font-semibold'
                  : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-background text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export function StockCountsClient() {
  const [counts, setCounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const router = useRouter();

  const fetchCounts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/inventory/stock-counts');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) setCounts(data.data);
    } catch (error) {
      console.error('Failed to fetch stock counts', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCounts(); }, []);

  const stableFetch = useCallback(fetchCounts, []);
  useLiveRefresh(stableFetch);

  // Reset page on search / pageSize change
  useEffect(() => { setPage(1); }, [search, pageSize]);

  const filtered = counts.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleOpen = (id: string) => router.push(`/inventory/stock-counts/${id}`);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <Input
          placeholder="Search counts..."
          className="w-full sm:w-80"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <NewCountDialog onCreated={fetchCounts} />
      </div>

      {/* ── Mobile card grid ── */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : filtered.length === 0
          ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
              {search ? `No counts matching "${search}"` : 'No stock counts yet.'}
            </div>
          )
          : paginated.map((count) => (
            <StockCountCard key={count.id} count={count} onOpen={handleOpen} />
          ))}
      </div>

      {/* Mobile pagination */}
      {!isLoading && filtered.length > 0 && (
        <div className="md:hidden">
          <Pagination
            total={filtered.length} page={safePage} pageSize={pageSize}
            onPageChange={setPage} onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* ── Desktop table ── */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Name/Reference</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {search ? `No counts matching "${search}"` : 'No stock counts found.'}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((count) => (
                <TableRow key={count.id}>
                  <TableCell>
                    {count.createdAt ? format(new Date(count.createdAt), 'PPP') : 'N/A'}
                  </TableCell>
                  <TableCell className="font-medium">{count.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <LocationLabel count={count} />
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass(count.status)}`}>
                      {count.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>{count.createdBy}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleOpen(count.id)}>
                      {count.status === 'in_progress'
                        ? <><Play className="h-4 w-4 mr-2" />Continue</>
                        : <><Eye className="h-4 w-4 mr-2" />View</>}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Desktop pagination */}
        {!isLoading && filtered.length > 0 && (
          <div className="border-t px-4 py-3">
            <Pagination
              total={filtered.length} page={safePage} pageSize={pageSize}
              onPageChange={setPage} onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── New Count Dialog ──────────────────────────────────────────────────────────
function NewCountDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track viewport so we only open ONE of: mobile sheet or desktop dialog
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [warehouseId, setWarehouseId] = useState<string>('all');
  const [shelfLocationIds, setShelfLocationIds] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [shelves, setShelves] = useState<{ id: string; name: string }[]>([]);

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (open) {
      fetch('/api/warehouses?activeOnly=true')
        .then((r) => r.json())
        .then((d) => { if (d.success) setWarehouses(d.data); })
        .catch(console.error);
      fetch('/api/shelf-locations')
        .then((r) => r.json())
        .then((d) => { if (d.success) setShelves(d.data); })
        .catch(console.error);
    }
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    setName('');
    setNotes('');
    setWarehouseId('all');
    setShelfLocationIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch('/api/inventory/stock-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, notes, createdBy: 'Admin',
          warehouseId: warehouseId !== 'all' ? warehouseId : undefined,
          shelfLocationIds: shelfLocationIds.length > 0 ? shelfLocationIds : undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to create count');
      const data = await res.json();
      await logActivity({
        action: 'CREATE',
        module: 'INVENTORY',
        description: `Initialized stock count: "${name}"${warehouseId && warehouseId !== 'all' ? ` — Warehouse: ${warehouseId}` : ''}`,
        referenceId: data.data?.id,
      });
      toast({ title: 'Stock count initialized successfully' });
      handleClose();
      dispatchStockUpdate();
      onCreated();
      router.push(`/inventory/stock-counts/${data.data.id}`);
    } catch (err) {
      console.error(err);
      toast({ title: 'An error occurred', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" /> Start New Count
      </Button>

      {/* ── Mobile bottom-sheet: only mounts when truly on a small screen ── */}
      <MobileNewCountSheet
        open={open && isMobile} onClose={handleClose} onSubmit={handleSubmit}
        name={name} setName={setName}
        notes={notes} setNotes={setNotes}
        warehouseId={warehouseId} setWarehouseId={setWarehouseId}
        shelfLocationIds={shelfLocationIds} setShelfLocationIds={setShelfLocationIds}
        warehouses={warehouses} shelves={shelves}
        isSubmitting={isSubmitting}
      />

      {/* ── Desktop modal: only opens on sm+ so its Radix overlay never shows on mobile ── */}
      <Dialog open={open && !isMobile} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="hidden sm:flex flex-col w-full max-w-lg rounded-2xl gap-0 p-0 overflow-hidden">
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="px-6 pt-6 pb-2">
              <DialogHeader>
                <DialogTitle>Start Stock Count</DialogTitle>
                <DialogDescription>
                  Takes a snapshot of current inventory so you can physically count
                  items while business operations continue.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="px-6 py-4 grid gap-5">
              <div className="space-y-2">
                <Label htmlFor="sc-name-d">Count Name / Reference</Label>
                <Input
                  id="sc-name-d"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Q1 Annual Count, End of Month"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Warehouse <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                  <Select value={warehouseId} onValueChange={setWarehouseId}>
                    <SelectTrigger><SelectValue placeholder="All Warehouses" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Warehouses</SelectItem>
                      {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Shelves <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between h-auto min-h-[40px] px-3 py-2 font-normal">
                        <div className="flex flex-wrap gap-1 items-center">
                          {shelfLocationIds.length > 0
                            ? shelfLocationIds.map((id) => {
                                const s = shelves.find((s) => s.id === id);
                                return (
                                  <Badge key={id} variant="secondary" className="font-normal flex items-center gap-1">
                                    {s?.name || id}
                                    <X className="h-3 w-3 cursor-pointer hover:text-destructive"
                                      onClick={(e) => { e.stopPropagation(); setShelfLocationIds((p) => p.filter((i) => i !== id)); }} />
                                  </Badge>
                                );
                              })
                            : <span className="text-muted-foreground">All Shelves</span>}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search shelves..." />
                        <CommandList>
                          <CommandEmpty>No shelf found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem onSelect={() => setShelfLocationIds(
                              shelfLocationIds.length === shelves.length ? [] : shelves.map((s) => s.id)
                            )}>
                              <Checkbox checked={shelfLocationIds.length === shelves.length && shelves.length > 0} className="mr-2" />
                              Select All
                            </CommandItem>
                            {shelves.map((shelf) => (
                              <CommandItem key={shelf.id} onSelect={() =>
                                setShelfLocationIds((p) =>
                                  p.includes(shelf.id) ? p.filter((id) => id !== shelf.id) : [...p, shelf.id]
                                )
                              }>
                                <Checkbox checked={shelfLocationIds.includes(shelf.id)} className="mr-2" />
                                {shelf.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sc-notes-d">Notes <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                <Textarea id="sc-notes-d" value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions..." rows={3} />
              </div>
            </div>

            <div className="border-t px-6 py-4">
              <DialogFooter className="flex-row gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Taking Snapshot…' : 'Take Snapshot'}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Mobile Bottom-Sheet 2-Step Wizard ────────────────────────────────────────
function MobileNewCountSheet({
  open, onClose, onSubmit,
  name, setName,
  notes, setNotes,
  warehouseId, setWarehouseId,
  shelfLocationIds, setShelfLocationIds,
  warehouses, shelves,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  name: string; setName: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  warehouseId: string; setWarehouseId: (v: string) => void;
  shelfLocationIds: string[]; setShelfLocationIds: React.Dispatch<React.SetStateAction<string[]>>;
  warehouses: { id: string; name: string }[];
  shelves: { id: string; name: string }[];
  isSubmitting: boolean;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [shelfSearch, setShelfSearch] = useState('');

  useEffect(() => { if (open) { setStep(1); setShelfSearch(''); } }, [open]);

  const filteredShelves = shelves.filter((s) =>
    s.name.toLowerCase().includes(shelfSearch.toLowerCase())
  );
  const canGoNext = name.trim().length > 0;

  if (!open) return null;

  return (
    <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 bg-background rounded-t-3xl shadow-2xl flex flex-col max-h-[92dvh]">

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-4 flex-shrink-0 border-b border-border/60">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-bold">Start Stock Count</h2>
            <button type="button" onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Takes a snapshot so you can count items while operations continue.
          </p>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            {([1, 2] as const).map((s, idx) => (
              <div key={s} className="flex items-center gap-2">
                {idx > 0 && <div className={`h-px w-6 transition-colors ${s <= step ? 'bg-primary' : 'bg-border'}`} />}
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  s < step ? 'bg-emerald-500 text-white'
                    : s === step ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {s < step ? <Check className="h-3 w-3" /> : s}
                </div>
                <span className={`text-xs font-medium ${s === step ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s === 1 ? 'Details' : 'Location'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

            {/* Step 1 */}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="sc-name-m" className="text-sm font-semibold">
                    Count Name / Reference <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sc-name-m"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Q1 Annual Count, End of Month"
                    className="h-11 text-base"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    A descriptive name so you can identify this count later.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sc-notes-m" className="text-sm font-semibold">
                    Notes <span className="font-normal text-muted-foreground">(Optional)</span>
                  </Label>
                  <Textarea
                    id="sc-notes-m"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special instructions for counters…"
                    className="text-base resize-none"
                    rows={4}
                  />
                </div>
              </>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Warehouse <span className="font-normal text-muted-foreground">(Optional)</span>
                  </Label>
                  <Select value={warehouseId} onValueChange={setWarehouseId}>
                    <SelectTrigger className="h-11 text-base">
                      <SelectValue placeholder="All Warehouses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Warehouses</SelectItem>
                      {warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">
                      Shelves <span className="font-normal text-muted-foreground">(Optional)</span>
                    </Label>
                    {shelfLocationIds.length > 0 && (
                      <button type="button" onClick={() => setShelfLocationIds([])}
                        className="text-xs text-muted-foreground hover:text-foreground underline">
                        Clear ({shelfLocationIds.length})
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search shelves…"
                      value={shelfSearch}
                      onChange={(e) => setShelfSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {shelves.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No shelves available</p>
                  ) : (
                    <div className="border border-border rounded-xl overflow-hidden divide-y divide-border/60 max-h-52 overflow-y-auto">
                      <label className="flex items-center gap-3 px-4 py-3 cursor-pointer bg-muted/20 hover:bg-muted/50 transition-colors">
                        <Checkbox
                          checked={shelfLocationIds.length === shelves.length && shelves.length > 0}
                          onCheckedChange={(v) => setShelfLocationIds(v ? shelves.map((s) => s.id) : [])}
                        />
                        <span className="text-sm font-medium">Select All ({shelves.length})</span>
                      </label>

                      {filteredShelves.length === 0
                        ? <p className="text-sm text-muted-foreground text-center py-4">No shelves match &quot;{shelfSearch}&quot;</p>
                        : filteredShelves.map((shelf) => (
                          <label key={shelf.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                            <Checkbox
                              checked={shelfLocationIds.includes(shelf.id)}
                              onCheckedChange={(v) =>
                                setShelfLocationIds((p) =>
                                  v ? [...p, shelf.id] : p.filter((id) => id !== shelf.id)
                                )
                              }
                            />
                            <span className="text-sm">{shelf.name}</span>
                          </label>
                        ))}
                    </div>
                  )}

                  {shelfLocationIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {shelfLocationIds.map((id) => {
                        const s = shelves.find((sh) => sh.id === id);
                        return (
                          <Badge key={id} variant="secondary" className="font-normal flex items-center gap-1 text-xs">
                            {s?.name || id}
                            <X className="h-3 w-3 cursor-pointer hover:text-destructive"
                              onClick={() => setShelfLocationIds((p) => p.filter((i) => i !== id))} />
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Sticky footer */}
          <div className="flex-shrink-0 border-t border-border/60 px-5 py-4 space-y-2">
            {step === 1 ? (
              <Button type="button" className="w-full h-11 text-base" disabled={!canGoNext} onClick={() => setStep(2)}>
                Next: Set Location <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => setStep(1)}>
                  <ChevronLeft className="h-4 w-4 mr-1.5" /> Back
                </Button>
                <Button type="submit" className="flex-1 h-11 text-base" disabled={isSubmitting}>
                  {isSubmitting ? 'Taking Snapshot…' : 'Take Snapshot'}
                </Button>
              </div>
            )}
            <button type="button" onClick={onClose}
              className="w-full text-center text-sm text-muted-foreground py-1 hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
