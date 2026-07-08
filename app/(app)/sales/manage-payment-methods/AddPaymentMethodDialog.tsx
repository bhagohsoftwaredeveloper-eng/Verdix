'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, FileX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function DataExistDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileX className="h-5 w-5 text-destructive" />
            Data Exist
          </DialogTitle>
          <DialogDescription>
            A payment method with this name already exists. Please choose a different name.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AddPaymentMethodDialogProps {
  onSave: (name: string, isReferenceRequired: boolean, pointsAmount?: number, currencyEquivalent?: number) => Promise<void>;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddPaymentMethodDialog({ onSave, children, open, onOpenChange }: AddPaymentMethodDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen;

  const [name, setName] = useState('');
  const [isReferenceRequired, setIsReferenceRequired] = useState(false);
  const [pointsAmount, setPointsAmount] = useState<string>('1');
  const [currencyEquivalent, setCurrencyEquivalent] = useState<string>('1');
  const [isSaving, setIsSaving] = useState(false);
  const [isDataExistOpen, setIsDataExistOpen] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Payment method name cannot be empty.' });
      return;
    }
    setIsSaving(true);
    try {
      const pAmount = name.toUpperCase() === 'POINTS' ? parseFloat(pointsAmount) || 1 : undefined;
      const cEquiv = name.toUpperCase() === 'POINTS' ? parseFloat(currencyEquivalent) || 1 : undefined;
      await onSave(name, isReferenceRequired, pAmount, cEquiv);
      toast({ title: 'Payment Method Added', description: `Payment method "${name}" has been successfully saved.` });
      setIsOpen(false);
      setName('');
      setIsReferenceRequired(false);
    } catch (error: any) {
      if (error.message === 'Payment method already exists') {
        setIsDataExistOpen(true);
      } else {
        console.error('Failed to save payment method', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save payment method. Please try again.' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Payment Method</DialogTitle>
            <DialogDescription>Enter the name for the new payment method.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-name" className="text-right">Name</Label>
              <Input
                id="add-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Credit Card"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add-ref-req" className="text-right">Ref. Required</Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch id="add-ref-req" checked={isReferenceRequired} onCheckedChange={setIsReferenceRequired} />
                <Label htmlFor="add-ref-req" className="font-normal text-muted-foreground">
                  Require reference number input
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSaving ? 'Saving...' : 'Save Method'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DataExistDialog isOpen={isDataExistOpen} onClose={() => setIsDataExistOpen(false)} />
    </>
  );
}
