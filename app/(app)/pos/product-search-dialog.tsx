
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import type { Product } from '@/lib/types';
import { useProducts } from '@/hooks/use-api';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import { useDebounce } from '@/hooks/use-debounce';
import { Loader2, Check, Package2 } from 'lucide-react';
import { calculateEffectivePrice } from '@/lib/pricing';
import { formatQuantity, formatStockQuantity } from '@/lib/utils';

interface ProductSearchDialogProps {
  onSelectProduct: (product: Product) => void;
  children?: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  showQuantityInSearch?: boolean;
  activeLevelId?: string;
  defaultLevelId?: string;
  activeLevelName?: string;
  warehouseId?: string;
}

export function ProductSearchDialog({ 
  onSelectProduct, 
  children, 
  isOpen, 
  onOpenChange, 
  showQuantityInSearch = true,
  activeLevelId,
  defaultLevelId,
  activeLevelName = 'Retail',
  warehouseId
}: ProductSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { products, loading, error, refetch: refetchProducts } = useProducts(debouncedSearchTerm, 'Available', undefined, warehouseId);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  // Multi-add session feedback
  const [addedCount, setAddedCount] = useState(0);
  const [flashId, setFlashId] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update displayed products only when not loading or when loading starts to keep previous results
  useEffect(() => {
    if (!loading && !error) {
      setDisplayedProducts(products);
    }
  }, [products, loading, error]);

  // Handle auto-refresh when stock is updated (e.g., after a sale)
  const stableRefresh = useCallback(() => { refetchProducts(); }, [refetchProducts]);
  useLiveRefresh(stableRefresh);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setAddedCount(0);
      setFlashId(null);
    }
  }, [isOpen, activeLevelId]);

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'F9') {
          e.preventDefault();
          e.stopPropagation();
          onOpenChange(false);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onOpenChange]);

  // Add the item but keep the drawer open so the cashier can add several in a row.
  // Gives quick "Added" feedback and a running count; close with Done / Esc / F9.
  const handleSelect = (productId: string) => {
    const product = displayedProducts.find(p => p.id === productId);
    if (product) {
      onSelectProduct(product);
      setAddedCount(c => c + 1);
      setFlashId(productId);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlashId(null), 900);
    }
  };

  const stockTone = (product: Product) => {
    if (product.stock <= 0) return 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
    if (product.reorderPoint && product.stock <= product.reorderPoint) return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="top"
        className="h-[50vh] w-full flex flex-col p-0 gap-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="px-6 py-4 border-b text-left space-y-0.5">
          <SheetTitle>Search Product</SheetTitle>
          <SheetDescription>
            Find a product by name or SKU and add it to the transaction.
          </SheetDescription>
        </SheetHeader>
        <Command shouldFilter={false} className="flex-1 flex flex-col overflow-hidden rounded-none">
          <div className="relative">
            <CommandInput
              placeholder="Type a product name or Barcode..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <CommandList className="flex-1 max-h-none overflow-y-auto">
            {error && <div className="p-4 text-center text-destructive">{error}</div>}

            {displayedProducts.length === 0 && !loading && !error && (
              <CommandEmpty className="flex h-32 items-center justify-center text-muted-foreground">
                No products found.
              </CommandEmpty>
            )}

            <CommandGroup className={loading ? "opacity-50 transition-opacity" : "transition-opacity"}>
              {displayedProducts.map((product) => {
                const isFlash = flashId === product.id;
                const outOfStock = product.stock <= 0;
                return (
                <CommandItem
                  key={product.id}
                  value={`${product.name} ${product.barcode || ''} ${product.sku}`}
                  onSelect={() => handleSelect(product.id)}
                  className={`group mx-2 my-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${isFlash ? 'bg-emerald-50 ring-1 ring-emerald-400 dark:bg-emerald-950/30' : ''}`}
                >
                  {/* Thumbnail */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package2 className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Name + meta */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {product.barcode || product.sku} · {product.unitOfMeasure}{product.category ? ` · ${product.category}` : ''}
                    </p>
                  </div>

                  {/* Stock badge */}
                  {!!showQuantityInSearch && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${stockTone(product)}`}>
                      {outOfStock ? 'Out of stock' : `${formatStockQuantity(product.stock)} ${product.unitOfMeasure}`}
                    </span>
                  )}

                  {/* Price + add hint */}
                  <div className="w-20 shrink-0 text-right">
                    <p className="font-mono font-bold text-primary">
                      ₱{calculateEffectivePrice(product, 1, activeLevelId, defaultLevelId).toFixed(2)}
                    </p>
                    {isFlash ? (
                      <span className="flex items-center justify-end gap-1 text-[11px] font-medium text-emerald-600">
                        <Check className="h-3 w-3" /> Added
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground opacity-0 transition-opacity group-data-[selected=true]:opacity-100">
                        Enter ↵ to add
                      </span>
                    )}
                  </div>
                </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>

        {/* Footer: keyboard hints, price level, running count, Done */}
        <div className="flex items-center justify-between border-t bg-muted/20 px-6 py-3 shrink-0">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="hidden items-center gap-1 sm:flex"><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">↵</kbd> add</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">Esc</kbd> close</span>
            <span className="hidden text-muted-foreground/70 md:inline">Prices: {activeLevelName}</span>
          </div>
          <div className="flex items-center gap-3">
            {addedCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <Check className="h-3.5 w-3.5" /> {addedCount} added
              </span>
            )}
            <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
