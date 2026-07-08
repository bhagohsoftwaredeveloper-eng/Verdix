'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SystemSettings } from '@/lib/types';

type Props = {
  settings: SystemSettings;
  set: <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void;
};

export function MarkupAutomationCard({ settings, set }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="h-5 w-5 flex items-center justify-center font-bold text-base">₱</span>
          Markup Automation
        </CardTitle>
        <CardDescription>Configure automatic price calculation logic</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="auto-markup">Enable Automatic Markup</Label>
            <p className="text-sm text-muted-foreground">
              Automatically calculate selling price based on cost and markup rules when adding products.
            </p>
          </div>
          <Switch
            id="auto-markup"
            checked={settings.enableAutomaticMarkup ?? true}
            onCheckedChange={checked => set('enableAutomaticMarkup', checked)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="default-markup">Global Default Markup (%)</Label>
          <Input
            id="default-markup"
            type="number"
            min="0"
            step="0.01"
            value={settings.defaultMarkupPercentage || 0}
            onChange={e => set('defaultMarkupPercentage', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
          <p className="text-xs text-muted-foreground">
            Fallback markup percentage if no specific category, brand, or supplier markup applies.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
