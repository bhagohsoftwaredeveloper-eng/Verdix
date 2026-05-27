
'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Loader2 } from 'lucide-react';
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
    }
  }, [isOpen, activeLevelId]);

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

  const handleSelect = (productId: string) => {
    const product = displayedProducts.find(p => p.id === productId);
    if (product) {
      onSelectProduct(product);
      onOpenChange(false);
    }
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
              {displayedProducts.map((product) => (
                <CommandItem
                  key={product.id}
                  value={`${product.name} ${product.barcode || ''} ${product.sku}`}
                  onSelect={() => handleSelect(product.id)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.barcode || product.sku} • {product.unitOfMeasure}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                      {!!showQuantityInSearch && (
                          <div className={`text-sm ${product.stock <= 0 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                              {formatStockQuantity(product.stock)} {product.unitOfMeasure}
                          </div>
                      )}
                      <div className="flex items-baseline gap-1">
                        <p className="font-mono font-bold text-primary">
                          ₱{calculateEffectivePrice(product, 1, activeLevelId, defaultLevelId).toFixed(2)}
                        </p>
                      </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </SheetContent>
    </Sheet>
  );
}
