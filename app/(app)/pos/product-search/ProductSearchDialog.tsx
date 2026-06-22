'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Loader2, Package2 } from 'lucide-react';
import { calculateEffectivePrice } from '@/lib/pricing';
import { formatStockQuantity } from '@/lib/utils';
import { useProductSearch } from './use-product-search';
import type { ProductSearchDialogProps } from './product-search-types';

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
  const { searchTerm, setSearchTerm, displayedProducts, loading, error, handleSelect, stockTone } = useProductSearch({
    isOpen,
    onOpenChange,
    onSelectProduct,
    activeLevelId,
    warehouseId,
  });

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
                const outOfStock = product.stock <= 0;
                return (
                <CommandItem
                  key={product.id}
                  value={`${product.name} ${product.barcode || ''} ${product.sku}`}
                  onSelect={() => handleSelect(product.id)}
                  className="group mx-2 my-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
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
                    <span className="text-[10px] text-muted-foreground opacity-0 transition-opacity group-data-[selected=true]:opacity-100">
                      Enter ↵ to add
                    </span>
                  </div>
                </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>

        {/* Footer: keyboard hints + active price level */}
        <div className="flex items-center justify-between border-t bg-muted/20 px-6 py-3 shrink-0 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1 sm:flex"><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">↵</kbd> select</span>
            <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono">Esc</kbd> close</span>
          </div>
          <span className="text-muted-foreground/70">Prices: {activeLevelName}</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
