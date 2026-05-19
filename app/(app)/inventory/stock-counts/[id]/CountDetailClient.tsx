'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { logActivity } from '@/lib/client-activity-logger';
import {
  ArrowLeft,
  Save,
  CheckCircle,
  Search,
  AlertTriangle,
  Printer,
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ─── Mobile Item Card ─────────────────────────────────────────────────────────
function MobileItemCard({
  item,
  isCompleted,
  onChange,
  onEnter,
}: {
  item: any;
  isCompleted: boolean;
  onChange: (id: string, value: string) => void;
  onEnter: () => void;
}) {
  const variance =
    item.counted_quantity !== null
      ? item.counted_quantity - item.snapshot_quantity
      : null;

  const [expanded, setExpanded] = useState(false);

  const isCounted = item.counted_quantity !== null;
  const hasVariance = variance !== null && variance !== 0;

  return (
    <div
      className={cn(
        'bg-card border rounded-2xl overflow-hidden transition-all duration-200',
        isCounted
          ? hasVariance
            ? variance < 0
              ? 'border-red-300 dark:border-red-800'
              : 'border-emerald-300 dark:border-emerald-800'
            : 'border-emerald-200 dark:border-emerald-900'
          : 'border-border'
      )}
    >
      {/* Card header – always visible */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center',
            isCounted
              ? hasVariance
                ? variance < 0
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-emerald-100 dark:bg-emerald-900/30'
                : 'bg-emerald-100 dark:bg-emerald-900/30'
              : 'bg-muted'
          )}
        >
          <Package
            className={cn(
              'h-4 w-4',
              isCounted
                ? hasVariance
                  ? variance < 0
                    ? 'text-red-500'
                    : 'text-emerald-500'
                  : 'text-emerald-500'
                : 'text-muted-foreground'
            )}
          />
        </div>

        {/* Name + SKU */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-tight truncate">{item.product_name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {item.product_sku || item.product_barcode || 'No SKU'}
          </p>
        </div>

        {/* Right side: counted qty / variance chip + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isCounted ? (
            <span
              className={cn(
                'text-xs font-bold px-2 py-0.5 rounded-full',
                hasVariance
                  ? variance < 0
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              )}
            >
              {item.counted_quantity}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground italic">Pending</span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-border/60 pt-3 space-y-3">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-muted/50 rounded-xl py-2 px-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                Snapshot
              </p>
              <p className="text-sm font-semibold">{item.snapshot_quantity}</p>
            </div>
            <div className="bg-muted/50 rounded-xl py-2 px-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                Counted
              </p>
              <p className="text-sm font-semibold">
                {isCounted ? item.counted_quantity : '—'}
              </p>
            </div>
            <div
              className={cn(
                'rounded-xl py-2 px-1',
                !isCounted
                  ? 'bg-muted/50'
                  : (variance ?? 0) === 0
                  ? 'bg-emerald-50 dark:bg-emerald-900/20'
                  : (variance ?? 0) < 0
                  ? 'bg-red-50 dark:bg-red-900/20'
                  : 'bg-emerald-50 dark:bg-emerald-900/20'
              )}
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                Variance
              </p>
              {!isCounted ? (
                <p className="text-sm font-semibold text-muted-foreground">—</p>
              ) : (variance ?? 0) === 0 ? (
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  ±0
                </p>
              ) : (variance ?? 0) < 0 ? (
                <p className="flex items-center justify-center gap-0.5 text-sm font-semibold text-red-600 dark:text-red-400">
                  <TrendingDown className="h-3 w-3" />
                  {variance}
                </p>
              ) : (
                <p className="flex items-center justify-center gap-0.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  +{variance}
                </p>
              )}
            </div>
          </div>

          {/* Input (only when in progress) */}
          {!isCompleted && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground min-w-[80px]">
                Enter count:
              </label>
              <Input
                type="number"
                min="0"
                className="flex-1 text-center h-9 text-base font-semibold"
                value={item.counted_quantity ?? ''}
                onChange={(e) => onChange(item.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setExpanded(false);
                    onEnter();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                inputMode="numeric"
                placeholder="0"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

// ─── Main Component ─────────────────────────────────────────────────────────
export function CountDetailClient({ countId }: { countId: string }) {
  const [count, setCount] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchDetails = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/inventory/stock-counts/${countId}`);
      if (!res.ok) {
        const errText = await res.text();
        console.error('Error response body:', errText);
        throw new Error(`Failed to fetch count details (Status ${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setCount(data.data);
        setItems(data.data.items || []);
      } else {
        throw new Error(data.error || 'Failed to fetch count details');
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Error loading count details', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [countId]);

  const handleQuantityChange = (id: string, value: string) => {
    const numValue = value === '' ? null : Number(value);
    setItems(items.map((item) => (item.id === id ? { ...item, counted_quantity: numValue } : item)));
  };

  const handleSaveProgress = async () => {
    try {
      setIsSaving(true);
      const payload = items
        .filter((item) => item.counted_quantity !== null)
        .map((item) => ({ id: item.id, counted_quantity: item.counted_quantity }));

      const res = await fetch(`/api/inventory/stock-counts/${countId}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      });

      if (!res.ok) throw new Error('Failed to save progress');

      toast({ title: 'Progress saved successfully' });
      await fetchDetails();
    } catch (error) {
      console.error(error);
      toast({ title: 'Failed to save progress', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    try {
      setIsCompleting(true);
      const payload = items
        .filter((item) => item.counted_quantity !== null)
        .map((item) => ({ id: item.id, counted_quantity: item.counted_quantity }));

      if (payload.length > 0) {
        await fetch(`/api/inventory/stock-counts/${countId}/items`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: payload }),
        });
      }

      const res = await fetch(`/api/inventory/stock-counts/${countId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedBy: 'Admin' }),
      });

      const result = await res.json();

      await logActivity({
        action: 'UPDATE',
        module: 'INVENTORY',
        description: `Completed stock count${result.pendingApproval ? ' (submitted for approval)' : ' — Inventory updated'}`,
        referenceId: countId,
      });
      if (result.pendingApproval) {
        toast({
          title: 'Stock count submitted for approval.',
          description: 'Inventory will be updated once approved.',
        });
      } else {
        toast({ title: 'Stock count completed! Inventory has been updated.' });
      }

      setShowReviewDialog(false);
      router.push('/inventory/stock-counts');
    } catch (error: any) {
      console.error(error);
      toast({ title: error.message || 'Error completing count', variant: 'destructive' });
    } finally {
      setIsCompleting(false);
    }
  };

  const handlePrint = () => window.print();

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const lowerSearch = search.toLowerCase();
    return items.filter(
      (item) =>
        item.product_name?.toLowerCase().includes(lowerSearch) ||
        item.product_sku?.toLowerCase().includes(lowerSearch) ||
        item.product_barcode?.toLowerCase().includes(lowerSearch)
    );
  }, [items, search]);

  const itemsWithVariances = useMemo(
    () =>
      items.filter(
        (item) => item.counted_quantity !== null && item.counted_quantity !== item.snapshot_quantity
      ),
    [items]
  );

  const uncountedItems = useMemo(
    () => items.filter((item) => item.counted_quantity === null),
    [items]
  );

  const countedCount = items.length - uncountedItems.length;
  const progressPct = items.length ? Math.round((countedCount / items.length) * 100) : 0;

  // ── Loading / not found ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Loading count details…</p>
      </div>
    );
  }

  if (!count) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <AlertTriangle className="h-10 w-10 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Count not found.</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/inventory/stock-counts')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const isCompleted = count.status === 'completed';

  return (
    <>
      <div className="space-y-4 non-printable">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          {/* Back + Title */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="flex-shrink-0 h-9 w-9 rounded-xl"
              onClick={() => router.push('/inventory/stock-counts')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold leading-tight">{count.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={isCompleted ? 'default' : 'secondary'} className="text-[10px]">
                  {count.status.replace('_', ' ').toUpperCase()}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(count.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons – full-width on mobile, auto on sm+ */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto non-printable">
            <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1 sm:flex-none">
              <Printer className="h-4 w-4 mr-1.5" />
              <span className="sm:inline">Print</span>
            </Button>
            {!isCompleted && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveProgress}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none"
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  {isSaving ? 'Saving…' : 'Save'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowReviewDialog(true)}
                  className="flex-1 sm:flex-none"
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Review &amp; Complete
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Progress bar (mobile-friendly summary) ─────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Counting Progress</span>
            <span className="text-muted-foreground">
              {countedCount} / {items.length} ({progressPct}%)
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-400 inline-block" />
              Variances: {itemsWithVariances.length}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-muted-foreground inline-block" />
              Uncounted: {uncountedItems.length}
            </span>
          </div>
        </div>

        {/* ── Search bar ─────────────────────────────────────────────────── */}
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchInputRef}
            placeholder="Scan barcode or search name / SKU…"
            className="pl-9 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* ── Mobile card list (hidden on md+) ───────────────────────────── */}
        <div className="flex flex-col gap-2 md:hidden">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              {search ? `No products matching "${search}"` : 'No items in this count.'}
            </div>
          ) : (
            filteredItems.map((item) => (
              <MobileItemCard
                key={item.id}
                item={item}
                isCompleted={isCompleted}
                onChange={handleQuantityChange}
                onEnter={() => searchInputRef.current?.focus()}
              />
            ))
          )}
        </div>

        {/* ── Desktop table (hidden on mobile) ───────────────────────────── */}
        <div className="hidden md:block rounded-md border bg-card text-card-foreground shadow-sm">
          <div className="p-4 border-b flex items-center justify-between bg-muted/20">
            <div className="flex items-center px-3 pl-0">
              <Search className="h-4 w-4 text-muted-foreground ml-3 absolute" />
              <Input
                placeholder="Scan barcode or search name/SKU..."
                className="pl-9 w-full sm:w-96"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="text-sm text-muted-foreground flex gap-4">
              <span>Total: {items.length}</span>
              <span>Counted: {countedCount}</span>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>SKU/Barcode</TableHead>
                <TableHead className="text-right">Expected (Snapshot)</TableHead>
                <TableHead className="text-right w-48">Actual Count</TableHead>
                {isCompleted && <TableHead className="text-right">Variance</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const variance =
                  item.counted_quantity !== null
                    ? item.counted_quantity - item.snapshot_quantity
                    : 0;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.product_sku || item.product_barcode || '-'}
                    </TableCell>
                    <TableCell className="text-right">{item.snapshot_quantity}</TableCell>
                    <TableCell className="text-right">
                      {isCompleted ? (
                        <span className="font-semibold">{item.counted_quantity ?? '-'}</span>
                      ) : (
                        <Input
                          type="number"
                          min="0"
                          className="w-24 text-right ml-auto"
                          value={item.counted_quantity ?? ''}
                          onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              searchInputRef.current?.focus();
                              searchInputRef.current?.select();
                            }
                          }}
                        />
                      )}
                    </TableCell>
                    {isCompleted && (
                      <TableCell
                        className={`text-right font-medium ${
                          variance < 0
                            ? 'text-red-500'
                            : variance > 0
                            ? 'text-green-500'
                            : ''
                        }`}
                      >
                        {item.counted_quantity === null
                          ? '-'
                          : variance > 0
                          ? `+${variance}`
                          : variance}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {filteredItems.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isCompleted ? 5 : 4}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No products found matching &quot;{search}&quot;
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Review Dialog ───────────────────────────────────────────────── */}
        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Stock Count</DialogTitle>
              <DialogDescription>
                Review the variances before applying. Once completed, inventory levels will be
                adjusted immediately.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 my-2">
              {/* Stock count details */}
              <div className="bg-muted/40 rounded-xl p-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Count Name</p>
                  <p className="font-medium">{count.name}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Created By</p>
                  <p className="font-medium">{count.created_by || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Date</p>
                  <p className="font-medium">{new Date(count.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Status</p>
                  <p className="font-medium capitalize">{count.status.replace('_', ' ')}</p>
                </div>
                {count.notes && (
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Notes</p>
                    <p className="text-muted-foreground italic">{count.notes}</p>
                  </div>
                )}
              </div>

              {/* Uncounted warning */}
              {uncountedItems.length > 0 && (
                <div className="bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl flex gap-3">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">
                      Uncounted Items ({uncountedItems.length})
                    </h4>
                    <p className="text-xs mt-1 leading-relaxed">
                      These items will not be adjusted and remain at their current live stock
                      level.
                    </p>
                  </div>
                </div>
              )}

              {/* Summary chips */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                    Total
                  </p>
                  <p className="text-lg font-bold">{items.length}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                    Counted
                  </p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {countedCount}
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                    Variances
                  </p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    {itemsWithVariances.length}
                  </p>
                </div>
              </div>

              {/* All items table */}
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  All Products ({items.length})
                </h3>

                {/* Mobile cards */}
                <div className="flex flex-col gap-2 sm:hidden">
                  {items.map((item) => {
                    const variance =
                      item.counted_quantity !== null
                        ? item.counted_quantity - item.snapshot_quantity
                        : null;
                    const isUncounted = item.counted_quantity === null;
                    const hasVar = variance !== null && variance !== 0;
                    return (
                      <div
                        key={item.id}
                        className={`border rounded-xl px-3 py-2.5 ${
                          isUncounted
                            ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-900/10'
                            : hasVar
                            ? variance! < 0
                              ? 'border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-900/10'
                              : 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-900/10'
                            : 'border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{item.product_name}</p>
                            {(item.product_sku || item.product_barcode) && (
                              <p className="text-xs text-muted-foreground">
                                {item.product_sku || item.product_barcode}
                              </p>
                            )}
                          </div>
                          {isUncounted ? (
                            <span className="flex-shrink-0 text-xs font-medium text-amber-600">Not counted</span>
                          ) : (
                            <span className={`flex-shrink-0 text-sm font-bold ${
                              !hasVar ? 'text-muted-foreground' : variance! < 0 ? 'text-red-500' : 'text-emerald-500'
                            }`}>
                              {!hasVar ? '±0' : variance! > 0 ? `+${variance}` : variance}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                          <span>Expected: {item.snapshot_quantity}</span>
                          <span>Counted: {isUncounted ? '—' : item.counted_quantity}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU / Barcode</TableHead>
                        <TableHead className="text-right">Expected</TableHead>
                        <TableHead className="text-right">Counted</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const variance =
                          item.counted_quantity !== null
                            ? item.counted_quantity - item.snapshot_quantity
                            : null;
                        const isUncounted = item.counted_quantity === null;
                        const hasVar = variance !== null && variance !== 0;
                        return (
                          <TableRow key={item.id} className={
                            isUncounted
                              ? 'bg-amber-50/40 dark:bg-amber-900/10'
                              : hasVar
                              ? variance! < 0
                                ? 'bg-red-50/40 dark:bg-red-900/10'
                                : 'bg-emerald-50/40 dark:bg-emerald-900/10'
                              : ''
                          }>
                            <TableCell className="font-medium">{item.product_name}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {item.product_sku || item.product_barcode || '—'}
                            </TableCell>
                            <TableCell className="text-right">{item.snapshot_quantity}</TableCell>
                            <TableCell className="text-right font-medium">
                              {isUncounted ? <span className="text-amber-500">—</span> : item.counted_quantity}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${
                              isUncounted
                                ? 'text-amber-500'
                                : !hasVar
                                ? 'text-muted-foreground'
                                : variance! < 0
                                ? 'text-red-500'
                                : 'text-emerald-500'
                            }`}>
                              {isUncounted ? 'Not counted' : !hasVar ? '±0' : variance! > 0 ? `+${variance}` : variance}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setShowReviewDialog(false)}
                disabled={isCompleting}
                className="flex-1 sm:flex-none"
              >
                Continue Counting
              </Button>
              <Button
                onClick={handleComplete}
                disabled={isCompleting}
                className="flex-1 sm:flex-none"
              >
                {isCompleting ? 'Applying Variances…' : 'Complete Count & Adjust Stock'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Dedicated Print Layout ───────────────────────────────────────── */}
      <div className="hidden print:block printable-area p-8 bg-white text-black font-sans">
        <div className="mb-8 border-b-2 border-black pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">STOCK COUNT REPORT</h1>
            <h2 className="text-xl font-semibold text-gray-700">{count.name}</h2>
            {count.notes && <p className="text-gray-500 mt-2 italic">{count.notes}</p>}
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>
              <strong>Status:</strong> {count.status.replace('_', ' ').toUpperCase()}
            </p>
            <p>
              <strong>Created Date:</strong>{' '}
              {new Date(count.created_at).toLocaleDateString()}
            </p>
            {isCompleted && count.completed_at && (
              <p>
                <strong>Completed Date:</strong>{' '}
                {new Date(count.completed_at).toLocaleDateString()}
              </p>
            )}
            <p>
              <strong>Created By:</strong> {count.created_by}
            </p>
          </div>
        </div>

        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-3 px-2 font-bold uppercase tracking-wider">Product Name</th>
              <th className="py-3 px-2 font-bold uppercase tracking-wider">SKU / Barcode</th>
              <th className="py-3 px-2 font-bold uppercase tracking-wider text-right">
                Expected
              </th>
              <th className="py-3 px-2 font-bold uppercase tracking-wider text-right">
                Actual Count
              </th>
              {isCompleted && (
                <th className="py-3 px-2 font-bold uppercase tracking-wider text-right">
                  Variance
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, index) => {
              const variance =
                item.counted_quantity !== null
                  ? item.counted_quantity - item.snapshot_quantity
                  : 0;
              return (
                <tr
                  key={`print-${item.id}`}
                  className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                >
                  <td className="py-3 px-2 border-b border-gray-200">{item.product_name}</td>
                  <td className="py-3 px-2 border-b border-gray-200 text-gray-600">
                    {item.product_sku || item.product_barcode || '-'}
                  </td>
                  <td className="py-3 px-2 border-b border-gray-200 text-right">
                    {item.snapshot_quantity}
                  </td>
                  <td className="py-3 px-2 border-b border-gray-200 text-right font-semibold">
                    {item.counted_quantity !== null ? item.counted_quantity : '______'}
                  </td>
                  {isCompleted && (
                    <td className="py-3 px-2 border-b border-gray-200 text-right">
                      {item.counted_quantity === null
                        ? '-'
                        : variance >= 0
                        ? `+${variance}`
                        : variance}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-12 pt-8 border-t border-gray-300 flex justify-between text-sm text-gray-500">
          <p>Report generated on: {new Date().toLocaleString()}</p>
          <p>Page 1 of 1</p>
        </div>
      </div>
    </>
  );
}
