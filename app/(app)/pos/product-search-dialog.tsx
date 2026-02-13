
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
import Image from 'next/image';
import { useProducts } from '@/hooks/use-api';
import { useDebounce } from '@/hooks/use-debounce';
import { Loader2 } from 'lucide-react';

interface ProductSearchDialogProps {
  onSelectProduct: (product: Product) => void;
  children?: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductSearchDialog({ onSelectProduct, children, isOpen, onOpenChange }: ProductSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { products, loading, error } = useProducts(debouncedSearchTerm, 'Available');
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);

  // Update displayed products only when not loading or when loading starts to keep previous results
  useEffect(() => {
    if (!loading && !error) {
      setDisplayedProducts(products);
    }
  }, [products, loading, error]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

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
                    <div className="flex items-center gap-4">
                      <Image
                        src={product.imageUrl || "https://picsum.photos/seed/default-product/400/300"}
                        alt={product.name}
                        width={40}
                        height={40}
                        className="rounded-md object-cover"
                      />
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.barcode || product.sku} • {product.unitOfMeasure}</p>
                      </div>
                    </div>
                    <p className="font-mono">₱{product.price.toFixed(2)}</p>
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
