import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePurchaseOrders, useProducts } from '@/hooks/use-api';
import { useUser } from '@/hooks/use-user';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface RecordBadOrderDialogProps {
  onSuccess: () => void;
}

interface BadOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  cost: number;
  reason: string;
  description: string;
}

export function RecordBadOrderDialog({ onSuccess }: RecordBadOrderDialogProps) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPO, setSelectedPO] = useState('');
  const [reportedBy, setReportedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<BadOrderItem[]>([]);

  // Effect to set reportedBy when user is loaded
  useEffect(() => {
    if (user?.email) {
      setReportedBy(user.email);
    }
  }, [user]);

  // Form for adding items
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');

  const { toast } = useToast();
  const { purchaseOrders } = usePurchaseOrders('', undefined, 1, 100);
  const { products } = useProducts();

  const selectedPOData = purchaseOrders.find((po) => po.id === selectedPO);
  const selectedPOItem = selectedPOData?.items.find((item) => item.productId === selectedProduct);

  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId);
    const item = selectedPOData?.items.find((i) => i.productId === productId);
    if (item) {
      setCost(item.cost.toString());
      // Optionally set max quantity or just show it
    }
  };

  const handleAddItem = () => {
    if (!selectedProduct || !quantity || !cost || !reason) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields for the item.',
        variant: 'destructive',
      });
      return;
    }

    const product = products.find((p) => p.id === selectedProduct);
    // If not found in global list (rare), try to get from PO item
    const productName = product?.name || selectedPOItem?.productName || 'Unknown Product';

    const newItem: BadOrderItem = {
      productId: selectedProduct,
      productName: productName,
      quantity: parseFloat(quantity),
      cost: parseFloat(cost),
      reason,
      description,
    };

    setItems([...items, newItem]);

    // Reset form
    setSelectedProduct('');
    setQuantity('');
    // cost is kept or reset? reset is safer to avoid carrying over wrong cost
    setCost('');
    setReason('');
    setDescription('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedPO || items.length === 0) {
      toast({
        title: 'Missing Information',
        description: 'Please select a purchase order and add at least one item.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/bad-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purchaseOrderId: selectedPO,
          supplierId: selectedPOData?.supplierId,
          supplierName: selectedPOData?.supplierName,
          reportedBy,
          reportDate: new Date().toISOString(),
          items,
          notes,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create bad order');
      }

      toast({
        title: 'Bad Order Recorded',
        description: 'The bad order has been recorded successfully.',
      });

      // Reset form
      setSelectedPO('');
      setReportedBy('');
      setNotes('');
      setItems([]);
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error('Failed to create bad order:', error);
      toast({
        title: 'Error',
        description: 'Failed to record bad order.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalValue = items.reduce((sum, item) => sum + item.quantity * item.cost, 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Record Bad Order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Bad Order</DialogTitle>
          <DialogDescription>
            Record defective or damaged items received from a supplier
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Purchase Order Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchaseOrder">Purchase Order *</Label>
              <Select value={selectedPO} onValueChange={(val) => {
                setSelectedPO(val);
                setSelectedProduct(''); // Reset product when PO changes
                setItems([]); // Verify if we want to clear items too? Probably yes.
              }}>
                <SelectTrigger id="purchaseOrder">
                  <SelectValue placeholder="Select purchase order" />
                </SelectTrigger>
                <SelectContent>
                  {purchaseOrders.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.id.substring(0, 12).toUpperCase()} - {po.supplierName} ({new Date(po.date).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportedBy">Reported By</Label>
              <Input
                id="reportedBy"
                placeholder="Enter your name"
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
              />
            </div>
          </div>

          {/* Add Item Form */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
            <div className="flex items-center justify-between">
               <h3 className="font-medium text-sm">Add Item Details</h3>
               {selectedPOItem && (
                 <span className="text-xs text-muted-foreground">
                   Ordered: {selectedPOItem.quantity} | Cost: ₱{selectedPOItem.cost.toFixed(2)}
                 </span>
               )}
            </div>
            
            <div className="grid grid-cols-12 gap-3 items-end">
              {/* Product - Context Aware */}
              <div className="col-span-4 space-y-2">
                <Label htmlFor="product" className="text-xs">Product *</Label>
                <Select value={selectedProduct} onValueChange={handleProductChange} disabled={!selectedPO}>
                  <SelectTrigger id="product">
                    <SelectValue placeholder={!selectedPO ? "Select PO first" : "Select product"} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedPOData?.items.map((item) => (
                      <SelectItem key={item.productId} value={item.productId}>
                        {item.productName}
                      </SelectItem>
                    )) || (
                       <div className="p-2 text-xs text-muted-foreground text-center">No items found</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

               {/* Reason */}
              <div className="col-span-3 space-y-2">
                <Label htmlFor="reason" className="text-xs">Reason *</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="reason">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Damaged">Damaged</SelectItem>
                    <SelectItem value="Defective">Defective</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                    <SelectItem value="Wrong Item">Wrong Item</SelectItem>
                    <SelectItem value="Missing">Missing</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div className="col-span-2 space-y-2">
                <Label htmlFor="quantity" className="text-xs">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-10"
                />
              </div>

              {/* Cost - Auto-filled but editable */}
              <div className="col-span-2 space-y-2">
                <Label htmlFor="cost" className="text-xs">Cost *</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="h-10"
                />
              </div>

               {/* Add Button */}
               <div className="col-span-1">
                 <Button type="button" onClick={handleAddItem} variant="secondary" className="w-full h-10 px-0">
                    <Plus className="h-4 w-4" />
                 </Button>
               </div>
            </div>
            
            {/* Description Row */}
            <div className="space-y-2">
                <Input
                  id="description"
                  placeholder="Description (Optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-8 text-xs"
                />
            </div>

          </div>

          {/* Items List */}
          {items.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Bad Items ({items.length})</Label>
              <div className="mt-2 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.reason}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">₱{item.cost.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">
                          ₱{(item.quantity * item.cost).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={4} className="text-right">
                        Total Affected Value:
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        ₱{totalValue.toFixed(2)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional information about this bad order..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || items.length === 0}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record Bad Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
