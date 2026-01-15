
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Minus, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CustomerWithLoyalty extends Customer {
  loyaltyPoints: number;
}

const pointsSchema = z.object({
  points: z.coerce.number().int().positive('Points must be a positive number.'),
  reason: z.string().min(3, 'A reason is required (min. 3 characters).'),
});

type PointsFormValues = z.infer<typeof pointsSchema>;


function AdjustPointsForm({
  customer,
  onFinished,
}: {
  customer: CustomerWithLoyalty;
  onFinished: () => void;
}) {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const { toast } = useToast();

  const form = useForm<PointsFormValues>({
    resolver: zodResolver(pointsSchema),
    defaultValues: {
      points: 0,
      reason: '',
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: PointsFormValues) {
    console.log('Mock point adjustment submitted:', {
      customerId: customer.id,
      adjustmentType,
      ...values,
    });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    const newPoints =
      adjustmentType === 'add'
        ? customer.loyaltyPoints + values.points
        : customer.loyaltyPoints - values.points;

    toast({
      title: 'Points Adjusted (Mock)',
      description: `${customer.name}'s new balance is ${newPoints} points.`,
    });

    onFinished();
    form.reset();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Adjust Points for {customer.name}</DialogTitle>
        <DialogDescription>
          Current Balance: {customer.loyaltyPoints} points.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-2 pt-4">
        <Button
          variant={adjustmentType === 'add' ? 'default' : 'outline'}
          onClick={() => setAdjustmentType('add')}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Points
        </Button>
        <Button
          variant={adjustmentType === 'remove' ? 'destructive' : 'outline'}
          onClick={() => setAdjustmentType('remove')}
        >
          <Minus className="mr-2 h-4 w-4" />
          Remove Points
        </Button>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={cn(
            'space-y-4 rounded-lg border p-4',
            adjustmentType === 'add' ? 'border-primary/50' : 'border-destructive/50'
          )}
        >
          <FormField
            control={form.control}
            name="points"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Points to {adjustmentType}</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason for Adjustment</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Birthday bonus, purchase refund" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onFinished}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant={adjustmentType === 'add' ? 'default' : 'destructive'}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                'Confirm Adjustment'
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}


export function AdjustPointsDialog({ customer, onFinished }: { customer: CustomerWithLoyalty; onFinished?: () => void; }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleDialogFinished = () => {
    setIsOpen(false);
    if (onFinished) {
      onFinished();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Star className="mr-2 h-4 w-4" />
          Adjust Points
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <AdjustPointsForm customer={customer} onFinished={handleDialogFinished} />
      </DialogContent>
    </Dialog>
  );
}

export function AdjustPointsDialogContent({ customer, onFinished }: { customer: CustomerWithLoyalty; onFinished: () => void; }) {
  return (
    <DialogContent className="sm:max-w-[480px]">
       <AdjustPointsForm customer={customer} onFinished={onFinished} />
    </DialogContent>
  );
}
