
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import type { Product } from '@/lib/types';
import { useProducts } from '@/hooks/use-api';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import { ArrowLeft } from 'lucide-react';
import { calculateEffectivePrice } from '@/lib/pricing';
import { formatQuantity, formatStockQuantity } from '@/lib/utils';

interface PriceInquiryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  activeLevelId?: string;
  defaultLevelId?: string;
  activeLevelName?: string;
}

export function PriceInquiryDialog({ 
  isOpen, 
  onOpenChange,
  activeLevelId,
  defaultLevelId,
  activeLevelName = 'Retail'
}: PriceInquiryDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { products, loading, error, refetch: refetchPriceProducts } = useProducts(searchTerm);

  // Handle auto-refresh when stock is updated (e.g., after a sale)
  const stableRefresh = useCallback(() => { refetchPriceProducts(); }, [refetchPriceProducts]);
  useLiveRefresh(stableRefresh);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedProduct(null);
    }
  }, [isOpen, activeLevelId]);

  const handleSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
    }
  };

  const closePriceDialog = () => {
      setSelectedProduct(null);
  }

  return (
    <>
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Price Inquiry</SheetTitle>
          <SheetDescription>
            Find a product by name or Barcode to check its price.
          </SheetDescription>
        </SheetHeader>
        <Command shouldFilter={false} className="border rounded-md min-h-[400px]">
          <CommandInput
            placeholder="Type a product name or Barcode..."
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
                      value={`${product.name} ${product.barcode || product.sku}`}
                      onSelect={() => handleSelect(product.id)}
                      className="flex items-center justify-between cursor-pointer p-3"
                    >
                      <div className="flex items-center">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.barcode || product.sku} • {product.unitOfMeasure}</p>
                        </div>
                      </div>
                       <Button size="sm" variant="secondary">Check Price</Button>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>

    {/* Price Result Dialog - Sibling to main dialog */}
    <Sheet open={!!selectedProduct} onOpenChange={(open) => !open && closePriceDialog()}>
        <SheetContent side="right" className="sm:max-w-md border-primary/20 shadow-2xl">
            <SheetHeader>
                <SheetTitle className="text-center text-xl">{selectedProduct?.name}</SheetTitle>
            </SheetHeader>
            
            {selectedProduct && (
                <div className="py-6 flex flex-col items-center animate-in zoom-in-95 duration-200">

                    
                    <div className="text-xs text-muted-foreground mb-4 font-mono bg-muted px-2 py-1 rounded">
                        {selectedProduct.barcode || selectedProduct.sku}
                    </div>

                    <div className="text-center w-full bg-primary/5 py-8 rounded-xl border-2 border-primary/10 shadow-sm relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                         <div className="text-xs font-bold text-primary/70 uppercase tracking-widest mb-1">{activeLevelName} Price</div>
                         <div className="text-5xl font-black text-primary tracking-tighter drop-shadow-sm">
                            ₱{calculateEffectivePrice(selectedProduct, 1, activeLevelId, defaultLevelId).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                         </div>
                    </div>

                    {selectedProduct.stock !== undefined && (
                       <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border">
                          <span>Available Stock:</span>
                          <span className={`font-bold ${selectedProduct.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {formatStockQuantity(selectedProduct.stock)} {selectedProduct.unitOfMeasure}
                          </span>
                       </div>
                    )}
                </div>
            )}

            <SheetFooter className="sm:justify-center">
                <Button size="lg" className="w-full sm:w-auto min-w-[120px]" onClick={closePriceDialog}>
                    Done
                </Button>
            </SheetFooter>
        </SheetContent>
    </Sheet>
    </>
  );
}
