import { Dialog } from "@/components/ui/dialog";
import { AdjustPointsDialogContent } from "../customer/loyalty/adjust-points-dialog";
import { Customer } from "@/lib/types";

interface LoyaltyRewardsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

export function LoyaltyRewardsDialog({ 
  isOpen, 
  onOpenChange, 
  customer 
}: LoyaltyRewardsDialogProps) {
  // Prepare customer object with loyalty points default if needed, 
  // and handle walk-in check similar to how it was done in the parent page
  const customerData = customer && customer.id !== 'walk-in'
    ? { ...customer, loyaltyPoints: customer.loyaltyPoints || 0 }
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <AdjustPointsDialogContent
        customer={customerData}
        onFinished={() => onOpenChange(false)}
        hideAdjustments
      />
    </Dialog>
  );
}
