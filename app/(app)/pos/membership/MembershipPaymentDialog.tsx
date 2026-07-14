'use client';

import { useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Loader2, Coins, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useMembershipPayment } from './use-membership-payment';
import type { MembershipPaymentDialogProps } from './membership-types';

function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function MembershipPaymentDialog({
  isOpen, onOpenChange, initialCustomer, shiftId, terminalId, userId,
}: MembershipPaymentDialogProps) {
  const { toast } = useToast();
  const {
    customers,
    selectedCustomerId, setSelectedCustomerId,
    existingCard, isCardLoading,
    fee, durationMonths,
    rfidCode, setRfidCode,
    pointSetting, setPointSetting,
    paymentMethod, setPaymentMethod,
    amountTendered, setAmountTendered,
    isSubmitting,
    submit,
  } = useMembershipPayment({ isOpen, initialCustomer, userId, shiftId, terminalId });

  const validUntil = useMemo(() => format(addMonths(new Date(), durationMonths), 'MMM dd, yyyy'), [durationMonths]);

  const isActivation = selectedCustomerId !== '' && !existingCard && !isCardLoading;
  const tendered = parseFloat(amountTendered) || 0;
  const change = paymentMethod === 'cash' ? Math.max(0, tendered - fee) : 0;

  const confirmDisabled =
    isSubmitting ||
    !selectedCustomerId ||
    fee <= 0 ||
    (isActivation && !rfidCode.trim()) ||
    (paymentMethod === 'cash' && tendered < fee);

  const handleConfirm = async () => {
    const result = await submit();
    if (result) {
      toast({
        title: result.isNewCard ? 'Membership activated' : 'Membership renewed',
        description: `${result.customerName} — valid until ${format(new Date(result.newExpiry), 'MMM dd, yyyy')}.`,
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Membership Payment</DialogTitle>
          <DialogDescription>Activate or renew a customer&apos;s loyalty card.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Customer */}
          <div className="grid gap-1.5">
            <Label htmlFor="mbr-customer">Customer</Label>
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger id="mbr-customer"><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isCardLoading && selectedCustomerId && (
            <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" />Checking loyalty card…</p>
          )}

          {/* Renewal vs Activation */}
          {selectedCustomerId && !isCardLoading && existingCard && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium text-cyan-600">Renewal</p>
              <p className="text-muted-foreground">
                Card {existingCard.rfid_code || '—'} · current expiry{' '}
                {existingCard.expiry_date ? format(new Date(existingCard.expiry_date), 'MMM dd, yyyy') : 'none'}
              </p>
            </div>
          )}

          {isActivation && (
            <div className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3">
              <p className="text-sm font-medium text-amber-700">New card — activation</p>
              <div className="grid gap-1.5">
                <Label htmlFor="mbr-rfid">RFID Card Code</Label>
                <Input id="mbr-rfid" placeholder="Scan or type RFID / card number" value={rfidCode} onChange={(e) => setRfidCode(e.target.value)} autoFocus />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="mbr-point">Point Setting (optional)</Label>
                <Input id="mbr-point" placeholder="e.g. default" value={pointSetting} onChange={(e) => setPointSetting(e.target.value)} />
              </div>
            </div>
          )}

          {/* Fee */}
          <div className="rounded-lg border p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Membership Fee</p>
              <p className="text-2xl font-black">₱{fee.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Valid Until</p>
              <p className="text-sm font-semibold">{validUntil}</p>
            </div>
          </div>

          {fee <= 0 && (
            <p className="text-xs text-destructive">Membership fee is not configured. Set it in POS Setup → General.</p>
          )}

          {/* Payment method */}
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={paymentMethod === 'cash' ? 'default' : 'outline'} className="h-auto py-2" onClick={() => setPaymentMethod('cash')}>
              <Coins className="h-4 w-4 mr-1.5" />Cash
            </Button>
            <Button type="button" variant={paymentMethod === 'card' ? 'default' : 'outline'} className="h-auto py-2" onClick={() => setPaymentMethod('card')}>
              <CreditCard className="h-4 w-4 mr-1.5" />Card
            </Button>
          </div>

          {paymentMethod === 'cash' && (
            <div className="grid gap-1.5">
              <Label htmlFor="mbr-tendered">Amount Tendered</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₱</span>
                <Input id="mbr-tendered" type="number" min={0} step="0.01" placeholder="0.00" className="pl-8" value={amountTendered} onChange={(e) => setAmountTendered(e.target.value)} />
              </div>
              <div className="flex items-center justify-between text-sm pt-1">
                <span className="text-muted-foreground flex items-center gap-1"><Wallet className="h-3.5 w-3.5" />Change</span>
                <span className="font-bold">₱{change.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={confirmDisabled} className="bg-emerald-600 hover:bg-emerald-700">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
