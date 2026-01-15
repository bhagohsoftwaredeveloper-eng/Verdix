
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Ban, ArrowLeft, ChevronsRight, Search } from 'lucide-react';
import type { Sale, SaleItem } from '@/lib/types';
import { format, subMinutes } from 'date-fns';
import { AdminAuthDialog } from './admin-auth-dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface VoidSalesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const MOCK_VOIDABLE_SALES: Sale[] = [
    {
        id: 'sale_rc_1',
        customer: { id: 'cust_1', name: 'Alice Johnson', contactNumber: '09171112233', paymentTerms: 'Net 30' },
        date: subMinutes(new Date(), 5).toISOString(),
        items: [
            { product: { id: 'prod_1', name: 'Wireless Keyboard', price: 75.0, stock: 100, category: 'Elec', brand: 'Logi', reorderPoint: 10, avgDailySales: 5, sku: 'WK-P', imageUrl: '', imageHint: '', unitOfMeasure: 'pc' }, quantity: 1, price: 75.0 },
            { product: { id: 'prod_2', name: 'Ergonomic Mouse', price: 45.0, stock: 100, category: 'Elec', brand: 'MS', reorderPoint: 10, avgDailySales: 5, sku: 'EM-P', imageUrl: '', imageHint: '', unitOfMeasure: 'pc' }, quantity: 1, price: 45.0 },
        ],
        total: 120.00,
        paymentMethod: 'Cash',
        status: 'Paid'
    },
    {
        id: 'sale_rc_2',
        customer: { id: 'cust_2', name: 'Bob Smith', contactNumber: '09182223344', paymentTerms: 'COD' },
        date: subMinutes(new Date(), 15).toISOString(),
        items: [
            { product: { id: 'prod_3', name: '4K UHD Monitor', price: 350.0, stock: 100, category: 'Elec', brand: 'Dell', reorderPoint: 10, avgDailySales: 5, sku: '4KM-U', imageUrl: '', imageHint: '', unitOfMeasure: 'pc' }, quantity: 2, price: 350.0 },
        ],
        total: 700.00,
        paymentMethod: 'Credit Card',
        status: 'Paid'
    },
];


function SelectItemsView({ sale, onVoidItems, onBack }: { sale: Sale, onVoidItems: (items: SaleItem[]) => void, onBack: () => void }) {
    const [selectedItems, setSelectedItems] = useState<SaleItem[]>([]);

    const handleItemSelect = (item: SaleItem) => {
        setSelectedItems(prev => 
            prev.some(i => i.product.id === item.product.id)
                ? prev.filter(i => i.product.id !== item.product.id)
                : [...prev, item]
        );
    };

    return (
        <>
            <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                    <Button variant="outline" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <DialogTitle>Select Items to Void</DialogTitle>
                        <DialogDescription>
                            From Sale ID: {sale.id.substring(0,7)}...
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>
            <ScrollArea className="h-80">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sale.items.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    <Checkbox
                                        checked={selectedItems.some(i => i.product.id === item.product.id)}
                                        onCheckedChange={() => handleItemSelect(item)}
                                    />
                                </TableCell>
                                <TableCell>{item.product.name}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">₱{item.price.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
             <DialogFooter>
                <Button variant="outline" onClick={onBack}>
                    Cancel
                </Button>
                <Button
                    variant="destructive"
                    disabled={selectedItems.length === 0}
                    onClick={() => onVoidItems(selectedItems)}
                >
                    <Ban className="mr-2 h-4 w-4" />
                    Void Selected Items ({selectedItems.length})
                </Button>
            </DialogFooter>
        </>
    );
}


export function VoidSalesDialog({
  isOpen,
  onOpenChange,
}: VoidSalesDialogProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [itemsToVoid, setItemsToVoid] = useState<SaleItem[]>([]);
  
  useEffect(() => {
    if (isOpen) {
        setIsLoading(true);
        setTimeout(() => {
            setSales(MOCK_VOIDABLE_SALES);
            setIsLoading(false);
        }, 500);
    } else {
        setSelectedSale(null);
        setSearchTerm('');
    }
  }, [isOpen]);
  
  const handleSelectItemsClick = (sale: Sale) => {
    setSelectedSale(sale);
  };
  
  const handleVoidItems = (items: SaleItem[]) => {
      setItemsToVoid(items);
      setIsAuthDialogOpen(true);
  };
  
  const handleAdminAuthSuccess = () => {
    if (selectedSale && itemsToVoid.length > 0) {
        console.log(`Voiding ${itemsToVoid.length} items from sale ${selectedSale.id}...`);
        
        if (itemsToVoid.length === selectedSale.items.length) {
            setSales(prev => prev.filter(s => s.id !== selectedSale.id));
        }
    }
    setItemsToVoid([]);
    setSelectedSale(null);
    setIsAuthDialogOpen(false);
  };

  const handleDialogClose = (open: boolean) => {
      if (!open) {
          setSelectedSale(null);
      }
      onOpenChange(open);
  }

  const filteredSales = useMemo(() => {
      if (!sales) return [];
      if (!searchTerm) return sales;
      const term = searchTerm.toLowerCase();
      return sales.filter(sale => 
          sale.id.toLowerCase().includes(term) ||
          sale.customer.name.toLowerCase().includes(term)
      );
  }, [sales, searchTerm]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-3xl">
          {selectedSale ? (
            <SelectItemsView 
                sale={selectedSale} 
                onVoidItems={handleVoidItems} 
                onBack={() => setSelectedSale(null)} 
            />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Void a Transaction</DialogTitle>
                <DialogDescription>
                    Select a transaction to view its items and select which ones to void.
                </DialogDescription>
              </DialogHeader>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by Sale ID or customer..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <ScrollArea className="h-96">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Sale ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Loading recent sales...
                                </TableCell>
                            </TableRow>
                        ) : filteredSales.length > 0 ? (
                            filteredSales.map((sale) => (
                                <TableRow key={sale.id}>
                                    <TableCell className="font-mono">{sale.id.substring(0, 7)}...</TableCell>
                                    <TableCell>{sale.customer.name}</TableCell>
                                    <TableCell>{format(new Date(sale.date || new Date()), 'p')}</TableCell>
                                    <TableCell className="text-right">₱{sale.total.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleSelectItemsClick(sale)}
                                        >
                                            <ChevronsRight className="mr-2 h-4 w-4" />
                                            Select Items
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No voidable sales found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
              </ScrollArea>
              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      <AdminAuthDialog
        isOpen={isAuthDialogOpen}
        onOpenChange={setIsAuthDialogOpen}
        onSuccess={handleAdminAuthSuccess}
      />
    </>
  );
}
