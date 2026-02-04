
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

interface ProductSearchDialogProps {
  onSelectProduct: (product: Product) => void;
  children?: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductSearchDialog({ onSelectProduct, children, isOpen, onOpenChange }: ProductSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { products, loading, error } = useProducts(searchTerm, 'Available');

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      onSelectProduct(product);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Search Product</DialogTitle>
          <DialogDescription>
            Find a product by name or SKU and add it to the transaction.
          </DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type a product name or Barcode..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {loading && <div className="p-4 text-center text-muted-foreground">Loading products...</div>}
            {error && <div className="p-4 text-center text-destructive">{error}</div>}
            {!loading && !error && (
              <>
                <CommandEmpty>No products found.</CommandEmpty>
                <CommandGroup>
                  {products.map((product) => (
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
              </>
            )}
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
