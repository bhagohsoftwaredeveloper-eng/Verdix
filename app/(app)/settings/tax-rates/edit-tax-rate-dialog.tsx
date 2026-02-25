
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';
import { TaxRate } from '@/lib/types';

interface EditTaxRateDialogProps {
  taxRate: TaxRate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaxRateUpdated: () => void;
}

export function EditTaxRateDialog({
  taxRate,
  open,
  onOpenChange,
  onTaxRateUpdated,
}: EditTaxRateDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    rate: '',
    description: '',
    isDefault: false,
  });

  useEffect(() => {
    if (taxRate) {
      setFormData({
        name: taxRate.name,
        rate: taxRate.rate.toString(),
        description: taxRate.description || '',
        isDefault: Boolean(taxRate.isDefault),
      });
    }
  }, [taxRate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(getApiUrl(`/settings/tax-rates/${taxRate.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          rate: parseFloat(formData.rate),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update tax rate');
      }

      toast({
        title: 'Success',
        description: 'Tax rate updated successfully',
      });

      onOpenChange(false);
      onTaxRateUpdated();
    } catch (error) {
      console.error('Error updating tax rate:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update tax rate',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Tax Rate</DialogTitle>
          <DialogDescription>
            Update tax rate configuration.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Tax Name</Label>
            <Input
              id="edit-name"
              placeholder="e.g., VAT, Sales Tax"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-rate">Rate (%)</Label>
            <Input
              id="edit-rate"
              type="number"
              step="0.01"
              placeholder="e.g., 12"
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description (Optional)</Label>
            <Textarea
              id="edit-description"
              placeholder="Additional details about this tax rate"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-isDefault"
              checked={formData.isDefault}
              onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked as boolean })}
            />
            <Label htmlFor="edit-isDefault">Set as default tax rate</Label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
