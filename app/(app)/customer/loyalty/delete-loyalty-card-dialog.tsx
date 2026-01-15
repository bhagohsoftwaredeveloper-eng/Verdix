'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CustomerWithLoyalty {
  id: string;
  customer_id: string;
  name: string;
  contact_number: string;
  payment_terms: string | null;
  rfid_code: string | null;
  expiry_date: string | null;
  point_setting: string | null;
  loyaltyPoints: number;
  last_transaction: string | null;
  created_at: string;
  updated_at: string;
}

export function DeleteLoyaltyCardDialog({ customer, onSuccess }: { customer: CustomerWithLoyalty, onSuccess?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  async function handleDelete() {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/customer-loyalty/${customer.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Loyalty Card Deleted',
          description: `Loyalty card for ${customer.name} has been deleted successfully.`,
        });
        setIsOpen(false);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to delete loyalty card.',
        });
      }
    } catch (error) {
      console.error('Error deleting loyalty card:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete loyalty card. Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" title="Delete Loyalty Card" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Loyalty Card</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the loyalty card for <strong>{customer.name}</strong>?
            This action cannot be undone and will permanently remove:
            <br />
            • All loyalty points ({customer.loyaltyPoints} points)
            <br />
            • RFID card information ({customer.rfid_code || 'No RFID code'})
            <br />
            • Point history and transactions
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Loyalty Card'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
