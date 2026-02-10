import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface ViewBadOrderDialogProps {
  badOrder: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function ViewBadOrderDialog({
  badOrder,
  open,
  onOpenChange,
  onUpdate,
}: ViewBadOrderDialogProps) {
  const [status, setStatus] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && badOrder) {
      setStatus(badOrder.status || '');
      setResolutionNotes(badOrder.resolutionNotes || '');
    }
  }, [open, badOrder]);

  if (!badOrder) return null;

  const handleUpdate = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/bad-orders/${badOrder.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          resolutionNotes,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update bad order');
      }

      toast({
        title: 'Bad Order Updated',
        description: 'The bad order has been updated successfully.',
      });

      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update bad order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update bad order.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const reasonBadgeColor = (reason: string) => {
    switch (reason) {
      case 'Damaged':
      case 'Defective':
        return 'destructive';
      case 'Expired':
        return 'secondary';
      case 'Wrong Item':
      case 'Missing':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bad Order Details</DialogTitle>
          <DialogDescription>
            View and update bad order information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Timeline */}
          <div className="relative py-4">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 z-0"></div>
            <div className="relative z-10 flex justify-between">
              {['Reported', 'Return Requested', 'Details', 'Resolved'].map((step, index) => {
                let isActive = false;
                let isCompleted = false;

                const statusMap: Record<string, number> = {
                  'Reported': 0,
                  'Return Requested': 1,
                  'Replaced': 3,
                  'Credited': 3,
                  'Resolved': 3,
                };

                const currentStepIndex = statusMap[badOrder.status] ?? 0;
                
                // Adjust for 'Details' being a visual spacer or intermediate state if needed
                // For now, simpler mapping:
                // 0: Reported
                // 1: Return Requested
                // 3: Resolved (Replaced/Credited)
                
                if (index <= currentStepIndex) isCompleted = true;
                if (index === currentStepIndex) isActive = true;

                // Special handling for 'Details' which isn't a status but a visual gap
                if (step === 'Details') {
                   return (
                    <div key={step} className="flex flex-col items-center opacity-0 pointer-events-none">
                        <div className="w-4 h-4 rounded-full bg-muted"></div>
                    </div>
                   )
                }

                return (
                  <div key={step} className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isActive ? 'bg-primary border-primary text-primary-foreground' :
                      isCompleted ? 'bg-primary border-primary text-primary-foreground' :
                      'bg-background border-muted text-muted-foreground'
                    }`}>
                      {isCompleted ? <span className="text-xs font-bold">✓</span> : <span className="text-xs">{index + 1}</span>}
                    </div>
                    <span className={`text-xs mt-2 font-medium ${isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Information */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Bad Order ID</p>
              <p className="text-sm font-semibold">{badOrder.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Purchase Order</p>
              <p className="text-sm font-semibold">{badOrder.purchaseOrderId}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Supplier</p>
              <p className="text-sm font-semibold">{badOrder.supplierName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Report Date</p>
              <p className="text-sm font-semibold">
                {format(new Date(badOrder.reportDate), 'PPP')}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Reported By</p>
              <p className="text-sm font-semibold">{badOrder.reportedBy || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Affected Value</p>
              <p className="text-sm font-semibold text-destructive">
                ₱{badOrder.totalAffectedValue.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          {/* Notes */}
          {badOrder.notes && (
            <div>
              <Label className="text-sm font-medium">Notes</Label>
              <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted/50 rounded">
                {badOrder.notes}
              </p>
            </div>
          )}

          {/* Items Table */}
          <div>
            <Label className="text-sm font-medium">Affected Items</Label>
            <div className="mt-2 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {badOrder.items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        ₱{item.cost.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₱{(item.quantity * item.cost).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={reasonBadgeColor(item.reason) as any} className="text-xs">
                          {item.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={item.description}>
                        {item.description || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Status Update */}
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Reported">Reported</SelectItem>
                  <SelectItem value="Return Requested">Return Requested</SelectItem>
                  <SelectItem value="Replaced">Replaced</SelectItem>
                  <SelectItem value="Credited">Credited</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolutionNotes">Resolution Notes</Label>
              <Textarea
                id="resolutionNotes"
                placeholder="Add notes about how this issue was resolved..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Close
          </Button>
          <Button onClick={handleUpdate} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
