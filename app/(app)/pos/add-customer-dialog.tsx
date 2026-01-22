'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddCustomerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerAdded: (customer: any) => void;
}

export function AddCustomerDialog({ isOpen, onOpenChange, onCustomerAdded }: AddCustomerDialogProps) {
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim() || !contactNumber.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Customer name and contact number are required.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const newCustomer = {
        customerId: 'CUST-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        name,
        contactNumber,
        address,
        active: true,
        paymentTerms: 'Due on receipt', // Default
      };

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCustomer),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create customer');
      }

      toast({
        title: 'Success',
        description: 'Customer added successfully.',
      });

      onCustomerAdded(result.data); // data contains { id, name } usually, but we might want full object. 
      // The API returns { id: customerId, name }. We should probably pass back the constructed object combined with ID if we want to select it immediately without re-fetching.
      // Ideally onCustomerAdded triggers a refresh or selects the customer.
      // Let's pass back the full object we sent + id.
      onCustomerAdded({ ...newCustomer, id: newCustomer.customerId }); 
      
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error adding customer:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add customer. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setContactNumber('');
    setAddress('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Customer</DialogTitle>
          <DialogDescription>
            Enter the details of the new customer here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contact">Contact Number</Label>
            <Input
              id="contact"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="e.g. 09123456789"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Complete address"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
