
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import type { Product } from '@/lib/types';
import { useProducts } from '@/hooks/use-api';
import { useDebounce } from '@/hooks/use-debounce';
import { Loader2 } from 'lucide-react';
import { calculateEffectivePrice } from '@/lib/pricing';

interface ProductSearchDialogProps {
  onSelectProduct: (product: Product) => void;
  children?: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  showQuantityInSearch?: boolean;
  activeLevelId?: string;
  defaultLevelId?: string;
  activeLevelName?: string;
}

export function ProductSearchDialog({ 
  onSelectProduct, 
  children, 
  isOpen, 
  onOpenChange, 
  showQuantityInSearch = true,
  activeLevelId,
  defaultLevelId,
  activeLevelName = 'Retail'
}: ProductSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { products, loading, error, refetch: refetchProducts } = useProducts(debouncedSearchTerm, 'Available');
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);

  // Update displayed products only when not loading or when loading starts to keep previous results
  useEffect(() => {
    if (!loading && !error) {
      setDisplayedProducts(products);
    }
  }, [products, loading, error]);

  // Handle auto-refresh when stock is updated (e.g., after a sale)
  useEffect(() => {
    const handleStockUpdate = () => {
      refetchProducts();
    };
    window.addEventListener('stock-updated', handleStockUpdate);
    return () => window.removeEventListener('stock-updated', handleStockUpdate);
  }, [refetchProducts]);

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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Search Product</DialogTitle>
          <DialogDescription>
            Find a product by name or SKU and add it to the transaction.
          </DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false}>
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
          <CommandList className="h-[400px] overflow-y-auto">
            {error && <div className="p-4 text-center text-destructive">{error}</div>}
            
            <div className={loading ? "opacity-50 transition-opacity" : "transition-opacity"}>
              {displayedProducts.length === 0 && !loading && !error && (
                <CommandEmpty className="flex h-[400px] items-center justify-center text-muted-foreground">
                  No products found.
                </CommandEmpty>
              )}
              
              <CommandGroup>
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
                                {product.stock} {product.unitOfMeasure}
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
            </div>
          </CommandList>
        </Command>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
