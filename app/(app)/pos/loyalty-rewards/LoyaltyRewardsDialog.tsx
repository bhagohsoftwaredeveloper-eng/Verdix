'use client';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AdjustPointsForm } from '../../customer/loyalty/adjust-points-dialog';
import { useLoyaltyRewards } from './use-loyalty-rewards';
import type { LoyaltyRewardsDialogProps } from './loyalty-rewards-types';

export function LoyaltyRewardsDialog({ isOpen, onOpenChange, customer }: LoyaltyRewardsDialogProps) {
  const { customerData } = useLoyaltyRewards(customer);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md w-full p-0 flex flex-col gap-0 overflow-hidden border-l">
        <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 shrink-0" />
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
          <AdjustPointsForm
            customer={customerData}
            onFinished={() => onOpenChange(false)}
            hideAdjustments
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
