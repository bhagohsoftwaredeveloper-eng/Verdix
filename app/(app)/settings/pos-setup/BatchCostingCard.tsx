'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Layers } from 'lucide-react';
import type { PosSettings } from './pos-setup-types';

type SetFn = <K extends keyof PosSettings>(key: K, value: PosSettings[K]) => void;

interface Props { settings: PosSettings; set: SetFn; }

export function BatchCostingCard({ settings, set }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" />Batch Costing Policy</CardTitle>
        <CardDescription>Control how inventory batch costs are tracked and applied during sales</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="batchCostingRepackInherit">Inherit Batch Cost When Repacking</Label>
            <p className="text-sm text-muted-foreground">
              When breaking bulk into packs, the child batch cost is calculated as
              <span className="font-mono text-xs bg-muted px-1 rounded ml-1">parent batch cost ÷ conversion factor</span>.
              <br />
              <span className="text-xs text-muted-foreground/70">OFF: Uses the current product cost instead (no batch inheritance).</span>
            </p>
          </div>
          <Switch id="batchCostingRepackInherit" checked={!!settings.batchCostingRepackInherit} onCheckedChange={v => set('batchCostingRepackInherit', v)} />
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="space-y-0.5">
            <Label htmlFor="batchCostingOversellBlock">Block Sale When Batch Stock Exhausted</Label>
            <p className="text-sm text-muted-foreground">
              Prevents a sale if the quantity exceeds the total tracked batch stock (e.g. from manual adjustments).
              <br />
              <span className="text-xs text-muted-foreground/70">
                OFF (default): Sale proceeds using the current <span className="font-mono text-xs bg-muted px-1 rounded">products.cost</span> as a fallback for untracked units.
              </span>
            </p>
          </div>
          <Switch id="batchCostingOversellBlock" checked={!!settings.batchCostingOversellBlock} onCheckedChange={v => set('batchCostingOversellBlock', v)} />
        </div>
      </CardContent>
    </Card>
  );
}
