'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface Props {
  lowStockThreshold: number;
  onChange: (value: number) => void;
}

export function InventoryAlertsCard({ lowStockThreshold, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Inventory Alerts
        </CardTitle>
        <CardDescription>Configure stock level notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
          <Input
            id="lowStockThreshold"
            type="number"
            value={lowStockThreshold}
            onChange={e => onChange(parseInt(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">Alert me when product stock falls below this number.</p>
        </div>
      </CardContent>
    </Card>
  );
}
