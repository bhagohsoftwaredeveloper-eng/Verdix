
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
import { Ban, ArrowLeft, ChevronsRight, Search } from 'lucide-react';
import type { Sale, SaleItem } from '@/lib/types';
import { format, subMinutes } from 'date-fns';
import { AdminAuthDialog } from './admin-auth-dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface VoidSalesDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}




function ConfirmVoidView({ sale, onVoidTransaction, onBack, isVoiding, voidError }: { sale: Sale, onVoidTransaction: () => void, onBack: () => void, isVoiding: boolean, voidError?: string }) {
    return (
        <>
            <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                    <Button variant="outline" size="icon" onClick={onBack} disabled={isVoiding}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <DialogTitle>Confirm Void Transaction</DialogTitle>
                        <DialogDescription>
                            SO Number: {sale.orderNumber || sale.id}
                        </DialogDescription>
                    </div>
                </div>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Customer:</div>
                    <div className="font-medium">{sale.customer.name}</div>
                    <div className="text-muted-foreground">Date:</div>
                    <div className="font-medium">{format(new Date(sale.date || new Date()), 'PPp')}</div>
                    <div className="text-muted-foreground">Total:</div>
                    <div className="font-medium text-lg">₱{sale.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                
                <ScrollArea className="h-48 border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sale.items.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item.product.name}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">₱{item.price.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
                
                <p className="text-sm text-muted-foreground">
                    This will void the entire transaction and restore stock for all items.
                </p>
                
                {voidError && (
                    <p className="text-sm text-destructive">{voidError}</p>
                )}
            </div>
            
            <DialogFooter>
                <Button variant="outline" onClick={onBack} disabled={isVoiding}>
                    Cancel
                </Button>
                <Button
                    variant="destructive"
                    onClick={onVoidTransaction}
                    disabled={isVoiding}
                >
                    <Ban className="mr-2 h-4 w-4" />
                    {isVoiding ? 'Voiding...' : 'Void Transaction'}
                </Button>
            </DialogFooter>
        </>
    );
}


export function VoidSalesDialog({
  isOpen,
  onOpenChange,
}: VoidSalesDialogProps) {
  const [step, setStep] = useState<'loading' | 'auth' | 'input_so' | 'select_items'>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [soNumber, setSoNumber] = useState('');
  const [searchError, setSearchError] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [posSettings, setPosSettings] = useState<any>(null);
  const authSucceededRef = useRef(false);

  // Settings are fetched fresh each time the dialog opens (see useEffect below)
  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
        authSucceededRef.current = false; // Reset on open
        setStep('loading'); // Start in loading state to prevent flash
        setSoNumber('');
        setSearchError('');
        setSelectedSale(null);
        
        // Add cache-busting parameter to ensure fresh settings
        fetch(`/api/pos-settings?_t=${Date.now()}`, { cache: 'no-store' })
          .then(res => res.json())
          .then(result => {
            if (result.success) {
                const settings = result.data;
                setPosSettings(settings);
                if (settings.enableVoidReturnAuth) {
                    setStep('auth');
                } else {
                    setStep('input_so');
                }
            } else {
                // Fallback if settings fail
                setStep('input_so');
            }
          })
          .catch(() => setStep('input_so'));
    }
  }, [isOpen]);
  
  const handleAuthSuccess = () => {
      authSucceededRef.current = true;
      setStep('input_so');
  };

  const handleAuthClose = (open: boolean) => {
      if (!open && !authSucceededRef.current) {
          // Only close the entire flow if auth was cancelled (not successful)
          onOpenChange(false);
      }
      // Reset the ref for next time
      authSucceededRef.current = false;
  };

  const handleSearchSO = async () => {
      const term = soNumber.trim();
      if (!term) return;
      
      setIsLoading(true);
      setSearchError('');
      console.log('VoidSalesDialog: Searching for SO:', term);
      
      try {
          const response = await fetch(`/api/pos/recent-sales?query=${encodeURIComponent(term)}`);
          const result = await response.json();
          console.log('VoidSalesDialog: Search result:', result);
          
          if (result.success && result.data && result.data.length > 0) {
              // Find exact match preferred, or take first
              // API searches "LIKE", so we might get partials. 
              const found = result.data.find((s: any) => String(s.orderNumber) === term || s.id === term) || result.data[0];
              console.log('VoidSalesDialog: Found sale:', found);
              setSelectedSale(found);
              setStep('select_items');
          } else {
              console.warn('VoidSalesDialog: No matching transaction found.');
              setSearchError('Transaction not found. Please check the SO Number.');
          }
      } catch (err) {
          console.error('VoidSalesDialog: Search error', err);
          setSearchError('Error searching transaction.');
      } finally {
          setIsLoading(false);
      }
  };
  
  const [isVoiding, setIsVoiding] = useState(false);
  const [voidError, setVoidError] = useState('');
  
  const handleVoidTransaction = async () => {
      if (!selectedSale) return;
      
      setIsVoiding(true);
      setVoidError('');
      console.log(`Voiding entire transaction ${selectedSale.id}, SO: ${selectedSale.orderNumber}...`);
      
      try {
          const response = await fetch('/api/pos/void-transaction', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ saleId: selectedSale.id }),
          });
          const result = await response.json();
          
          if (result.success) {
              console.log('VoidSalesDialog: Transaction voided successfully');
              onOpenChange(false);
          } else {
              setVoidError(result.error || 'Failed to void transaction');
          }
      } catch (err) {
          console.error('VoidSalesDialog: Error voiding transaction', err);
          setVoidError('Error connecting to server');
      } finally {
          setIsVoiding(false);
      }
  };

  const handleBackToSearch = () => {
      setStep('input_so');
      setSelectedSale(null);
      setSoNumber('');
  };

  return (
    <>
      <Dialog open={isOpen && (step === 'input_so' || step === 'select_items')} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
            {step === 'select_items' && selectedSale ? (
                 <ConfirmVoidView 
                    sale={selectedSale} 
                    onVoidTransaction={handleVoidTransaction}
                    onBack={handleBackToSearch}
                    isVoiding={isVoiding}
                    voidError={voidError}
                />
            ) : (
                <>
                    <DialogHeader>
                        <DialogTitle>Void Transaction</DialogTitle>
                        <DialogDescription>
                            Enter the SO Number of the transaction you want to void.
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
        requiredCredentials={null}
        title="Void Authorization"
        description="Enter admin credentials to access void functions."
      />
    </>
  );
}
