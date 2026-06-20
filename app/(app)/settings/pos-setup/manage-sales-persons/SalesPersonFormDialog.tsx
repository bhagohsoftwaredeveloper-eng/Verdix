'use client';

import { useState } from 'react';
import { SalesPerson } from '@/lib/types';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Props = {
  salesPerson?: SalesPerson;
  onSave: (name: string, contactNumber?: string) => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
};

export function SalesPersonFormDialog({ salesPerson, onSave, children, disabled }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(salesPerson?.name || '');
  const [contactNumber, setContactNumber] = useState(salesPerson?.contactNumber || '');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Sales person name cannot be empty.' });
      return;
    }
    setIsSaving(true);
    try {
      await onSave(name, contactNumber);
      toast({ title: salesPerson ? 'Sales Person Updated' : 'Sales Person Added', description: `"${name}" has been successfully saved.` });
      setIsOpen(false);
      if (!salesPerson) { setName(''); setContactNumber(''); }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save sales person. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild disabled={disabled}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{salesPerson ? 'Edit Sales Person' : 'Add New Sales Person'}</DialogTitle>
          <DialogDescription>
            {salesPerson
              ? `Editing the sales person "${salesPerson.name}".`
              : 'Enter the name and contact number for the new sales person.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sp-name" className="text-right">Name</Label>
            <Input id="sp-name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" placeholder="e.g., John Doe" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="sp-contact" className="text-right">Contact Number</Label>
            <Input id="sp-contact" value={contactNumber} onChange={e => setContactNumber(e.target.value)} className="col-span-3" placeholder="e.g., +1-555-0101" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Sales Person'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
