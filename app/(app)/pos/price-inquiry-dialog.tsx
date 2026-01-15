
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { Product } from '@/lib/types';
import Image from 'next/image';
import { useProducts } from '@/hooks/use-api';

interface PriceInquiryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function PriceInquiryDialog({ isOpen, onOpenChange }: PriceInquiryDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isPriceAlertOpen, setIsPriceAlertOpen] = useState(false);
  const { products, loading, error } = useProducts(searchTerm);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      setIsPriceAlertOpen(true);
    }
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      setSelectedProduct(null);
    }
    onOpenChange(open);
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Price Inquiry</DialogTitle>
          <DialogDescription>
            Find a product by name or SKU to check its price.
          </DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type a product name or SKU..."
            value={searchTerm}
            onValueChange={setSearchTerm}
            autoFocus
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
                      value={`${product.name} ${product.sku}`}
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
                          <p className="text-sm text-muted-foreground">{product.sku}</p>
                        </div>
                      </div>
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

    {selectedProduct && (
        <AlertDialog open={isPriceAlertOpen} onOpenChange={setIsPriceAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{selectedProduct.name}</AlertDialogTitle>
                    <AlertDialogDescription>
                        The current price for this item is:
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="text-4xl font-bold text-center text-primary py-4">
                    ₱{selectedProduct.price.toFixed(2)}
                </div>
                <AlertDialogAction onClick={() => setIsPriceAlertOpen(false)}>
                    OK
                </AlertDialogAction>
            </AlertDialogContent>
        </AlertDialog>
    )}
    </>
  );
}
