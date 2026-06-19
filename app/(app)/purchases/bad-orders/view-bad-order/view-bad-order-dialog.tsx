'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Printer } from 'lucide-react';
import { printBadOrder } from '@/lib/print-bad-order';

import { useViewBadOrder, type ViewBadOrderDialogProps } from './use-view-bad-order';
import { StatusTimeline } from './status-timeline';
import { OrderInfoGrid } from './order-info-grid';
import { AffectedItemsTable } from './affected-items-table';

export function ViewBadOrderDialog(props: ViewBadOrderDialogProps) {
  const { badOrder, open, onOpenChange } = props;
  const {
    status, setStatus,
    resolutionNotes, setResolutionNotes,
    isSubmitting,
    handleUpdate,
  } = useViewBadOrder(props);

  if (!badOrder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-none max-w-full w-full h-screen max-h-screen flex flex-col p-0 gap-0 bg-background border-none rounded-none m-0 shadow-none">
        <DialogHeader className="px-6 py-4 border-b bg-background shrink-0">
          <DialogTitle>Bad Order Details</DialogTitle>
          <DialogDescription>View and update bad order information</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">

            <StatusTimeline currentStatus={badOrder.status} />

            <OrderInfoGrid badOrder={badOrder} />

            {badOrder.notes && (
              <div>
                <Label className="text-sm font-medium">Notes</Label>
                <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted/50 rounded">
                  {badOrder.notes}
                </p>
              </div>
            )}

            <AffectedItemsTable items={badOrder.items} />

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
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20 shrink-0">
          <Button variant="outline" onClick={() => printBadOrder(badOrder)} disabled={isSubmitting}>
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
          <div className="flex-1" />
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
