'use client';

import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/lib/types';

interface CustomerDialogProps {
  customer?: Customer;
  onSave: (name: string, contactNumber: string, paymentTerms: string) => Promise<void>;
  children: React.ReactNode;
}

export function CustomerDialog({ customer, onSave, children }: CustomerDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(customer?.name || '');
  const [contactNumber, setContactNumber] = useState(customer?.contactNumber || '');
  const [paymentTerms, setPaymentTerms] = useState(customer?.paymentTerms || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim() || !contactNumber.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Customer name and contact number cannot be empty.' });
      return;
    }
    setIsSaving(true);
    try {
      await onSave(name, contactNumber, paymentTerms);
      toast({ title: customer ? 'Customer Updated (Mock)' : 'Customer Added (Mock)', description: `Customer "${name}" has been successfully saved.` });
      setIsOpen(false);
      if (!customer) { setName(''); setContactNumber(''); setPaymentTerms(''); }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save customer. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{customer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
          <DialogDescription>
            {customer ? `Editing the customer "${customer.name}".` : 'Enter the details for the new customer.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="e.g., John Doe" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contactNumber" className="text-right">Contact No.</Label>
            <Input id="contactNumber" type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} className="col-span-3" placeholder="e.g., 09171234567" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="paymentTerms" className="text-right">Payment Terms</Label>
            <Input id="paymentTerms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="col-span-3" placeholder="e.g., Net 30" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim() || !contactNumber.trim()}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Customer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
