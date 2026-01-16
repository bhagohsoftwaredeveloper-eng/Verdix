'use client';

import { useState, useEffect } from 'react';
import { Bell, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Product } from '@/lib/types';
import { getProducts } from '@/app/(app)/products/actions';
import Link from 'next/link';

export function NotificationsBell() {
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getProducts() as Product[];
        setProducts(data);
        const lowStock = data.filter(p => {
             const rop = p.primarySupplierRop ?? p.reorderPoint ?? 0;
             return p.stock < rop;
        });
        setLowStockItems(lowStock);
      } catch (e) {
        console.error("Failed to load products for notifications", e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
    // Poll every 5 minutes
    const interval = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const hasNotifications = lowStockItems.length > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full relative">
          <Bell className="h-5 w-5" />
          {hasNotifications && (
            <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background" />
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {hasNotifications && (
            <span className="text-xs text-muted-foreground">{lowStockItems.length} alerts</span>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Checking stock...</div>
          ) : !hasNotifications ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No new notifications</div>
          ) : (
            <div className="grid gap-1">
              {lowStockItems.map(item => (
                <div key={item.id} className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors">
                  <div className="mt-1">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="grid gap-1">
                    <p className="text-sm font-medium">Low Stock: {item.name}</p>
                    <p className="text-xs text-muted-foreground">
                       Stock: {item.stock} / ROP: {item.primarySupplierRop ?? item.reorderPoint ?? 0}
                    </p>
                    <Link href={`/products?search=${encodeURIComponent(item.name)}`} className="text-xs text-primary hover:underline">
                      View Product
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
