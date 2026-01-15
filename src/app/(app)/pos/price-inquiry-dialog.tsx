
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

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'parent_1',
    name: 'Wireless Keyboard - Container',
    description: 'A sleek, modern wireless keyboard.',
    category: 'Electronics',
    brand: 'Logitech',
    stock: 144, 
    reorderPoint: 20,
    avgDailySales: 5,
    price: 75.0,
    cost: 50.0,
    sku: 'WK-001-PARENT',
    imageUrl: 'https://picsum.photos/seed/keyboard/400/300',
    imageHint: 'wireless keyboard',
    unitOfMeasure: 'Piece',
    conversionFactor: 1,
    isSerialized: false,
  },
  {
    id: 'child_1_1',
    name: 'Wireless Keyboard (Piece)',
    parentId: 'parent_1',
    description: 'A single wireless keyboard.',
    category: 'Electronics',
    brand: 'Logitech',
    stock: 120,
    reorderPoint: 20,
    avgDailySales: 5,
    price: 75.0,
    cost: 50.0,
    sku: 'WK-001-P',
    imageUrl: 'https://picsum.photos/seed/keyboard/400/300',
    imageHint: 'wireless keyboard',
    unitOfMeasure: 'Piece',
    conversionFactor: 1,
    isSerialized: false,
  },
  {
    id: 'child_1_2',
    name: 'Wireless Keyboard (Box of 5)',
    parentId: 'parent_1',
    description: 'A box containing 5 wireless keyboards.',
    category: 'Electronics',
    brand: 'Logitech',
    stock: 24, 
    reorderPoint: 4,
    avgDailySales: 1, 
    price: 350.0,
    cost: 240.0,
    sku: 'WK-001-B5',
    imageUrl: 'https://picsum.photos/seed/keyboard/400/300',
    imageHint: 'keyboard box',
    unitOfMeasure: 'Box',
    conversionFactor: 5,
    isSerialized: false,
  },
  {
    id: 'parent_2',
    name: 'Ergonomic Mouse',
    description: 'An ergonomic wireless mouse for all-day comfort.',
    category: 'Electronics',
    brand: 'Microsoft',
    stock: 0, 
    reorderPoint: 15,
    avgDailySales: 8,
    price: 45.0,
    cost: 30.0,
    sku: 'EM-002-P',
    imageUrl: 'https://picsum.photos/seed/mouse/400/300',
    imageHint: 'ergonomic mouse',
    unitOfMeasure: 'Piece',
    conversionFactor: 1,
    isSerialized: true,
  },
  {
    id: 'parent_3',
    name: '4K UHD Monitor',
    description: 'A 27-inch 4K UHD monitor with vibrant colors.',
    category: 'Electronics',
    brand: 'Dell',
    stock: 45,
    reorderPoint: 10,
    avgDailySales: 2,
    price: 350.0,
    cost: 280.0,
    sku: '4KM-003-U',
    imageUrl: 'https://picsum.photos/seed/monitor/400/300',
    imageHint: 'computer monitor',
    unitOfMeasure: 'Unit',
    conversionFactor: 1,
    isSerialized: false,
  },
];


interface PriceInquiryDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function PriceInquiryDialog({ isOpen, onOpenChange }: PriceInquiryDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isPriceAlertOpen, setIsPriceAlertOpen] = useState(false);

  useEffect(() => {
    // Simulate fetching products
    setProducts(MOCK_PRODUCTS);
  }, []);

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
        <Command>
          <CommandInput placeholder="Type a product name or SKU..." autoFocus />
          <CommandList>
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
                      src={product.imageUrl}
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
