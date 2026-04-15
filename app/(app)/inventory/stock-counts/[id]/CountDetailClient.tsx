'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, CheckCircle, Search, AlertTriangle, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function CountDetailClient({ countId }: { countId: string }) {
  const [count, setCount] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchDetails = async () => {
    console.log("CountDetailClient mounted. countId prop:", countId);
    try {
      setIsLoading(true);
      const res = await fetch(`/api/inventory/stock-counts/${countId}`);
      console.log("Fetch response status:", res.status);
      if (!res.ok) {
        const errText = await res.text();
        console.error("Error response body:", errText);
        throw new Error(`Failed to fetch count details (Status ${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setCount(data.data);
        setItems(data.data.items || []);
      } else {
        throw new Error(data.error || 'Failed to fetch count details');
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Error loading count details', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [countId]);

  const handleQuantityChange = (id: string, value: string) => {
    const numValue = value === '' ? null : Number(value);
    setItems(items.map(item => 
      item.id === id ? { ...item, counted_quantity: numValue } : item
    ));
  };

  const handleSaveProgress = async () => {
    try {
      setIsSaving(true);
      const payload = items
        .filter(item => item.counted_quantity !== null)
        .map(item => ({
          id: item.id,
          counted_quantity: item.counted_quantity
        }));

      const res = await fetch(`/api/inventory/stock-counts/${countId}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload })
      });

      if (!res.ok) throw new Error('Failed to save progress');
      
      toast({ title: 'Progress saved successfully' });
      await fetchDetails();
    } catch (error) {
      console.error(error);
      toast({ title: 'Failed to save progress', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    try {
      setIsCompleting(true);
      // Auto-save first
      const payload = items
        .filter(item => item.counted_quantity !== null)
        .map(item => ({
          id: item.id,
          counted_quantity: item.counted_quantity
        }));

      if (payload.length > 0) {
        await fetch(`/api/inventory/stock-counts/${countId}/items`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: payload })
        });
      }

      // Then complete
      const res = await fetch(`/api/inventory/stock-counts/${countId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedBy: 'Admin' })
      });

      const result = await res.json();
      
      if (result.pendingApproval) {
        toast({ title: 'Stock count submitted for approval.', description: 'Inventory will be updated once approved.' });
      } else {
        toast({ title: 'Stock count completed successfully! Inventory has been updated.' });
      }
      
      setShowReviewDialog(false);
      router.push('/inventory/stock-counts');
    } catch (error: any) {
      console.error(error);
      toast({ title: error.message || 'Error completing count', variant: 'destructive' });
    } finally {
      setIsCompleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const lowerSearch = search.toLowerCase();
    return items.filter(item => 
      item.product_name?.toLowerCase().includes(lowerSearch) ||
      item.product_sku?.toLowerCase().includes(lowerSearch) ||
      item.product_barcode?.toLowerCase().includes(lowerSearch)
    );
  }, [items, search]);

  const itemsWithVariances = useMemo(() => {
    return items.filter(item => 
      item.counted_quantity !== null && 
      item.counted_quantity !== item.snapshot_quantity
    );
  }, [items]);

  const uncountedItems = useMemo(() => {
    return items.filter(item => item.counted_quantity === null);
  }, [items]);

  if (isLoading) {
    return <div>Loading details...</div>;
  }

  if (!count) {
    return <div>Count not found.</div>;
  }

  const isCompleted = count.status === 'completed';

  return (
    <>
    <div className="space-y-6 non-printable">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/inventory/stock-counts')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{count.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={isCompleted ? "default" : "secondary"}>
                {count.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Started {new Date(count.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 non-printable">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          {!isCompleted && (
            <>
              <Button variant="outline" onClick={handleSaveProgress} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Progress'}
              </Button>
              <Button onClick={() => setShowReviewDialog(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Review & Complete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="rounded-md border bg-card text-card-foreground shadow-sm">
        <div className="p-4 border-b flex items-center justify-between bg-muted/20 non-printable">
          <div className="flex items-center px-3 pl-0">
            <Search className="h-4 w-4 text-muted-foreground ml-3 absolute" />
            <Input
              ref={searchInputRef}
              placeholder="Scan barcode or search name/SKU..."
              className="pl-9 w-full sm:w-96"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="text-sm text-muted-foreground flex gap-4">
            <span>Total Items: {items.length}</span>
            <span>Counted: {items.length - uncountedItems.length}</span>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>SKU/Barcode</TableHead>
              <TableHead className="text-right">Expected (Snapshot)</TableHead>
              <TableHead className="text-right w-48">Actual Count</TableHead>
              {isCompleted && <TableHead className="text-right">Variance</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map(item => {
               const variance = item.counted_quantity !== null 
                  ? item.counted_quantity - item.snapshot_quantity 
                  : 0;
               return (
                 <TableRow key={item.id}>
                   <TableCell className="font-medium">{item.product_name}</TableCell>
                   <TableCell className="text-muted-foreground text-sm">
                     {item.product_sku || item.product_barcode || '-'}
                   </TableCell>
                   <TableCell className="text-right">{item.snapshot_quantity}</TableCell>
                   <TableCell className="text-right">
                     {isCompleted ? (
                       <span className="font-semibold">{item.counted_quantity ?? '-'}</span>
                     ) : (
                       <Input 
                         type="number"
                         min="0"
                         className="w-24 text-right ml-auto"
                         value={item.counted_quantity ?? ''}
                         onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                         onKeyDown={(e) => {
                           if (e.key === 'Enter') {
                             // Optional: Move to next input or focus search
                             searchInputRef.current?.focus();
                             searchInputRef.current?.select();
                           }
                         }}
                       />
                     )}
                   </TableCell>
                   {isCompleted && (
                     <TableCell className={`text-right font-medium ${variance < 0 ? 'text-red-500' : variance > 0 ? 'text-green-500' : ''}`}>
                       {item.counted_quantity === null ? '-' : variance > 0 ? `+${variance}` : variance}
                     </TableCell>
                   )}
                 </TableRow>
               );
            })}
            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={isCompleted ? 5 : 4} className="text-center py-8 text-muted-foreground">
                  No products found matching "{search}"
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Stock Count</DialogTitle>
            <DialogDescription>
              Review the variances before applying. Once completed, inventory levels will be adjusted immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 my-4">
            {uncountedItems.length > 0 && (
              <div className="bg-yellow-50 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-900/50 p-4 rounded-md flex gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Uncounted Items ({uncountedItems.length})</h4>
                  <p className="text-sm mt-1">There are items that have not been counted. They will not be adjusted and will remain at their current live stock level.</p>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-medium mb-2">Variances to Apply ({itemsWithVariances.length})</h3>
              {itemsWithVariances.length === 0 ? (
                <p className="text-muted-foreground text-sm">All counted items match their expected snapshot exactly. No stock adjustments will be made.</p>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Expected</TableHead>
                        <TableHead className="text-right">Counted</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsWithVariances.map(item => {
                        const variance = (item.counted_quantity ?? 0) - item.snapshot_quantity;
                        return (
                          <TableRow key={item.id}>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell className="text-right">{item.snapshot_quantity}</TableCell>
                            <TableCell className="text-right font-medium">{item.counted_quantity}</TableCell>
                            <TableCell className={`text-right font-bold ${variance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {variance > 0 ? `+${variance}` : variance}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)} disabled={isCompleting}>
              Continue Counting
            </Button>
            <Button onClick={handleComplete} disabled={isCompleting}>
              {isCompleting ? 'Applying Variances...' : 'Complete Count & Adjust Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

    {/* Dedicated Print Layout */}
    <div className="hidden print:block printable-area p-8 bg-white text-black font-sans">
        <div className="mb-8 border-b-2 border-black pb-4 flex justify-between items-end">
           <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1">STOCK COUNT REPORT</h1>
              <h2 className="text-xl font-semibold text-gray-700">{count.name}</h2>
              {count.notes && <p className="text-gray-500 mt-2 italic">{count.notes}</p>}
           </div>
           <div className="text-right text-sm text-gray-600">
              <p><strong>Status:</strong> {count.status.replace('_', ' ').toUpperCase()}</p>
              <p><strong>Created Date:</strong> {new Date(count.created_at).toLocaleDateString()}</p>
              {isCompleted && count.completed_at && (
                <p><strong>Completed Date:</strong> {new Date(count.completed_at).toLocaleDateString()}</p>
              )}
              <p><strong>Created By:</strong> {count.created_by}</p>
           </div>
        </div>

        <table className="w-full text-left text-sm border-collapse">
           <thead>
             <tr className="border-b-2 border-black">
                <th className="py-3 px-2 font-bold uppercase tracking-wider">Product Name</th>
                <th className="py-3 px-2 font-bold uppercase tracking-wider">SKU / Barcode</th>
                <th className="py-3 px-2 font-bold uppercase tracking-wider text-right">Expected</th>
                <th className="py-3 px-2 font-bold uppercase tracking-wider text-right">Actual Count</th>
                {isCompleted && <th className="py-3 px-2 font-bold uppercase tracking-wider text-right">Variance</th>}
             </tr>
           </thead>
           <tbody>
             {filteredItems.map((item, index) => {
                const variance = item.counted_quantity !== null 
                   ? item.counted_quantity - item.snapshot_quantity 
                   : 0;
                return (
                  <tr key={`print-${item.id}`} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="py-3 px-2 border-b border-gray-200">{item.product_name}</td>
                    <td className="py-3 px-2 border-b border-gray-200 text-gray-600">{item.product_sku || item.product_barcode || '-'}</td>
                    <td className="py-3 px-2 border-b border-gray-200 text-right">{item.snapshot_quantity}</td>
                    <td className="py-3 px-2 border-b border-gray-200 text-right font-semibold">
                      {item.counted_quantity !== null ? item.counted_quantity : '______'}
                    </td>
                    {isCompleted && (
                      <td className="py-3 px-2 border-b border-gray-200 text-right">
                         {item.counted_quantity === null ? '-' : variance >= 0 ? `+${variance}` : variance}
                      </td>
                    )}
                  </tr>
                );
             })}
           </tbody>
        </table>
        
        <div className="mt-12 pt-8 border-t border-gray-300 flex justify-between text-sm text-gray-500">
           <p>Report generated on: {new Date().toLocaleString()}</p>
           <p>Page 1 of 1</p>
        </div>
    </div>
    </>
  );
}
