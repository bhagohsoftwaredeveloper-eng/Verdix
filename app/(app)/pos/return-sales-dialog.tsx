
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
import { Undo, ArrowLeft, ChevronsRight, Search } from 'lucide-react';
import type { Sale, SaleItem } from '@/lib/types';
import { format, subMinutes } from 'date-fns';
import { AdminAuthDialog } from './admin-auth-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { printCreditSlip } from './print-credit-slip';

interface ReturnSalesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentUser?: any;
  terminalId?: string;
}

const MOCK_RETURNABLE_SALES: Sale[] = [
    {
        id: 'sale_rc_1',
        customer: { id: 'cust_1', name: 'Alice Johnson', contactNumber: '09171112233', paymentTerms: 'Net 30' },
        date: subMinutes(new Date(), 5).toISOString(),
        items: [
            { product: { id: 'prod_1', name: 'Wireless Keyboard', description: 'Mock Description', price: 75.0, stock: 100, category: 'Elec', brand: 'Logi', reorderPoint: 10, avgDailySales: 5, sku: 'WK-P', imageUrl: '', imageHint: '', unitOfMeasure: 'pc' }, quantity: 1, price: 75.0 },
            { product: { id: 'prod_2', name: 'Ergonomic Mouse', description: 'Mock Description', price: 45.0, stock: 100, category: 'Elec', brand: 'MS', reorderPoint: 10, avgDailySales: 5, sku: 'EM-P', imageUrl: '', imageHint: '', unitOfMeasure: 'pc' }, quantity: 1, price: 45.0 },
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
            { product: { id: 'prod_3', name: '4K UHD Monitor', description: 'Mock Description', price: 350.0, stock: 100, category: 'Elec', brand: 'Dell', reorderPoint: 10, avgDailySales: 5, sku: '4KM-U', imageUrl: '', imageHint: '', unitOfMeasure: 'pc' }, quantity: 2, price: 350.0 },
        ],
        total: 700.00,
        paymentMethod: 'Credit Card',
        status: 'Paid'
    },
];


function SelectItemsView({ sale, onReturnItems, onBack }: { sale: Sale, onReturnItems: (items: SaleItem[]) => void, onBack: () => void }) {
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});

    const handleItemToggle = (item: SaleItem) => {
        const itemId = item.product.id;
        const newSelected = new Set(selectedItems);
        
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
            // Cleanup quantity state
            const newQuantities = { ...returnQuantities };
            delete newQuantities[itemId];
            setReturnQuantities(newQuantities);
        } else {
            newSelected.add(itemId);
            // Default to max quantity
            setReturnQuantities(prev => ({ ...prev, [itemId]: item.quantity }));
        }
        
        setSelectedItems(newSelected);
    };

    const handleQuantityChange = (item: SaleItem, value: string) => {
        const qty = parseInt(value);
        if (isNaN(qty) || qty < 1) return;
        
        // Cap at sold quantity
        const validQty = Math.min(qty, item.quantity);
        setReturnQuantities(prev => ({ ...prev, [item.product.id]: validQty }));
    };

    const handleConfirmReturn = () => {
        const itemsToReturn = sale.items
            .filter(item => selectedItems.has(item.product.id))
            .map(item => ({
                ...item,
                quantity: returnQuantities[item.product.id] || item.quantity
            }));
        
        onReturnItems(itemsToReturn);
    };

    return (
        <>
            <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                    <Button variant="outline" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <DialogTitle>Select Items to Return</DialogTitle>
                        <DialogDescription>
                            From SO Number: {sale.orderNumber || sale.id}
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
                            <TableHead>Unit</TableHead>
                            <TableHead className="text-right">Sold Qty</TableHead>
                            <TableHead className="text-right">Return Qty</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sale.items.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    <Checkbox
                                        checked={selectedItems.has(item.product.id)}
                                        onCheckedChange={() => handleItemToggle(item)}
                                    />
                                </TableCell>
                                <TableCell>{item.product.name}</TableCell>
                                <TableCell>{item.product.unitOfMeasure}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">
                                    {selectedItems.has(item.product.id) ? (
                                        <Input 
                                            type="number" 
                                            min="1" 
                                            max={item.quantity}
                                            className="w-20 ml-auto h-8 text-right"
                                            value={returnQuantities[item.product.id] || ''}
                                            onChange={(e) => handleQuantityChange(item, e.target.value)}
                                        />
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
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
                    disabled={selectedItems.size === 0}
                    onClick={handleConfirmReturn}
                >
                    <Undo className="mr-2 h-4 w-4" />
                    Return Selected Items ({selectedItems.size})
                </Button>
            </DialogFooter>
        </>
    );
}



const ReturnSuccessView = ({ 
    returnedTotal, 
    saleId, 
    onClose,
    onPrint
}: { 
    returnedTotal: number, 
    saleId: string, 
    onClose: () => void,
    onPrint?: () => void
}) => {
    return (
        <>
            <DialogHeader>
                <div className="flex flex-col items-center justify-center space-y-2 mb-4">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="24" 
                            height="24" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            className="text-green-600"
                        >
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    </div>
                    <DialogTitle className="text-xl text-center">Return Successful</DialogTitle>
                    <DialogDescription className="text-center">
                        Items have been returned to inventory.
                    </DialogDescription>
                </div>
            </DialogHeader>

            <div className="py-6 space-y-6">
                <div className="bg-muted p-4 rounded-lg space-y-3">
                    <p className="text-sm text-center text-muted-foreground font-medium uppercase tracking-wider">
                        Merchandise Credit Issued
                    </p>
                    <p className="text-4xl font-bold text-center text-primary">
                        ₱{returnedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                
                <div className="text-center text-sm text-muted-foreground">
                    <p>Reference Transaction: <span className="font-mono font-medium text-foreground">{saleId}</span></p>
                </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button 
                    className="w-full sm:w-auto" 
                    variant="outline" 
                    onClick={onPrint}
                >
                    <Search className="mr-2 h-4 w-4" /> {/* Using Search as generic icon placeholders if Printer not avail, but Printer is imported */}
                    Print Credit Slip
                </Button>
                <Button 
                    className="w-full sm:w-auto" 
                    onClick={onClose}
                >
                    Close
                </Button>
            </DialogFooter>
        </>
    );
};

export function ReturnSalesDialog({
  isOpen,
  onOpenChange,
  currentUser,
  terminalId,
}: ReturnSalesDialogProps) {
  const [step, setStep] = useState<'loading' | 'auth' | 'input_so' | 'select_items' | 'success'>('loading');
  const [sales, setSales] = useState<Sale[]>([]); // Kept for type safety if needed, but not used for list
  const [isLoading, setIsLoading] = useState(false);
  const [soNumber, setSoNumber] = useState('');
  const [searchError, setSearchError] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [itemsToReturn, setItemsToReturn] = useState<SaleItem[]>([]);
  const [returnedItems, setReturnedItems] = useState<SaleItem[]>([]);
  const [posSettings, setPosSettings] = useState<any>(null);
  const [returnedTotal, setReturnedTotal] = useState(0);
  const authSucceededRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
        authSucceededRef.current = false;
        setStep('loading');
        setIsLoading(false);
        setSoNumber('');
        setSearchError('');
        setSelectedSale(null);
        setReturnedTotal(0);
        setReturnedItems([]);
        
        // Fetch settings first to determine step
        fetch(`/api/pos-settings?_t=${Date.now()}`, { cache: 'no-store' })
          .then(res => res.json())
          .then(result => {
            if (result.success) {
                 const settings = result.data;
                 setPosSettings(settings);
                 
                 if (settings.enableReturnAuth) {
                     setStep('auth');
                 } else {
                     setStep('input_so');
                 }
            } else {
                setStep('input_so'); // Fallback
            }
          })
          .catch(err => {
              console.error(err);
              setStep('input_so');
          });
    }
  }, [isOpen]);
  
  const handleAuthSuccess = () => {
      authSucceededRef.current = true;
      setStep('input_so');
  };

  const handleAuthClose = (open: boolean) => {
      // If auth dialog is closed without success, close the whole return dialog
      if (!open && !authSucceededRef.current) {
          onOpenChange(false);
      }
      authSucceededRef.current = false;
  };

  const handleSearchSO = async () => {
      const term = soNumber.trim();
      if (!term) return;
      
      setIsLoading(true);
      setSearchError('');
      console.log('ReturnSalesDialog: Searching for SO:', term);
      
      try {
          const response = await fetch(`/api/pos/recent-sales?query=${encodeURIComponent(term)}`);
          const result = await response.json();
          console.log('ReturnSalesDialog: Search result:', result);
          
          if (result.success && result.data && result.data.length > 0) {
              // Find exact match preferred, or take first
              const found = result.data.find((s: any) => String(s.orderNumber) === term || s.id === term) || result.data[0];
              console.log('ReturnSalesDialog: Found sale:', found);
              setSelectedSale(found);
              setStep('select_items');
          } else {
              console.warn('ReturnSalesDialog: No matching transaction found.');
              setSearchError('Transaction not found. Please check the SO Number.');
          }
      } catch (err) {
          console.error('ReturnSalesDialog: Search error', err);
          setSearchError('Error searching transaction.');
      } finally {
          setIsLoading(false);
      }
  };
  
  const handleReturnItems = async (items: SaleItem[]) => {
      if (selectedSale && items.length > 0) {
          setIsLoading(true);
          try {
              const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
              
              const response = await fetch('/api/sales/returns', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      saleId: selectedSale.id,
                      items: items.map(item => ({
                          productId: item.product.id,
                          productName: item.product.name,
                          quantity: item.quantity,
                          price: item.price
                      })),
                      terminalId: terminalId || posSettings?.terminalId, 
                      userId: currentUser?.uid || currentUser?.id || null,
                      reason: 'POS Return',
                      totalAmount
                  })
              });

              const result = await response.json();
              if (result.success) {
                  setReturnedTotal(totalAmount);
                  setReturnedItems(items);
                  setStep('success');
              } else {
                  setSearchError(result.error || 'Failed to process return');
              }
          } catch (err) {
              console.error('Error processing return:', err);
              setSearchError('Error processing return. Please try again.');
          } finally {
              setIsLoading(false);
          }
      }
  };

  const handleBackToSearch = () => {
      setStep('input_so');
      setSelectedSale(null);
      setSoNumber('');
  };

  const handleCloseSuccess = () => {
      onOpenChange(false);
  }

  const handlePrintCredit = () => {
      if (!selectedSale || returnedItems.length === 0) return;

      printCreditSlip({
          originalSoNumber: String(selectedSale.orderNumber || selectedSale.id),
          customerName: selectedSale.customer?.name || 'Walk-in Customer',
          date: new Date().toISOString(),
          cashierName: currentUser?.name || currentUser?.displayName || currentUser?.username || 'Cashier',
          items: returnedItems.map(item => ({
              name: item.product.name,
              quantity: item.quantity,
              unitOfMeasure: item.product.unitOfMeasure,
              price: item.price,
              total: item.quantity * item.price
          })),
          totalAmount: returnedTotal
      }, {
           businessName: posSettings?.businessName,
           address: posSettings?.address,
           contactNumber: posSettings?.contactNumber,
           tin: posSettings?.tin
      });
  }

  return (
    <>
      <Dialog open={isOpen && (step === 'input_so' || step === 'select_items' || step === 'success')} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          {step === 'success' ? (
              <ReturnSuccessView 
                returnedTotal={returnedTotal} 
                saleId={String(selectedSale?.orderNumber || selectedSale?.id || '')} 
                onClose={handleCloseSuccess}
                onPrint={handlePrintCredit}
              />
          ) : step === 'select_items' && selectedSale ? (
            <SelectItemsView 
                sale={selectedSale} 
                onReturnItems={handleReturnItems} 
                onBack={handleBackToSearch} 
            />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Process a Return</DialogTitle>
                <DialogDescription>
                    Enter the SO Number of the transaction you want to return items from.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-6 space-y-4">
                  <div className="flex gap-2">
                      <Input
                          placeholder="Enter SO Number (e.g. 10001)"
                          value={soNumber}
                          onChange={(e) => setSoNumber(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearchSO()}
                          autoFocus
                      />
                      <Button onClick={handleSearchSO} disabled={isLoading || !soNumber.trim()}>
                          {isLoading ? 'Searching...' : 'Search'}
                      </Button>
                  </div>
                  {searchError && (
                      <p className="text-sm text-destructive">{searchError}</p>
                  )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      <AdminAuthDialog
        isOpen={isOpen && step === 'auth'}
        onOpenChange={handleAuthClose}
        onSuccess={handleAuthSuccess}
        requiredCredentials={posSettings?.enableReturnAuth ? {
            username: posSettings.returnAuthUsername,
            password: posSettings.returnAuthPassword
        } : null}
        title="Return Authorization"
        description="Enter authorized credentials to access return functions."
      />
    </>
  );
}
