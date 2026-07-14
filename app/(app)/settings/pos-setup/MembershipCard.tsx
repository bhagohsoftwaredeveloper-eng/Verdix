'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CreditCard } from 'lucide-react';
import type { PosSettings } from './pos-setup-types';

type SetFn = <K extends keyof PosSettings>(key: K, value: PosSettings[K]) => void;

interface Props { settings: PosSettings; set: SetFn; }

export function MembershipCard({ settings, set }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Membership</CardTitle>
        <CardDescription>Configure the loyalty-card membership fee and how long a paid membership stays valid</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="membershipFee">Membership Fee (₱)</Label>
          <p className="text-sm text-muted-foreground">Amount charged to activate or renew a customer&apos;s loyalty card.</p>
          <Input
            id="membershipFee"
            type="number"
            min={0}
            step="0.01"
            value={settings.membershipFee ?? 0}
            onChange={e => set('membershipFee', parseFloat(e.target.value) || 0)}
            className="h-9 w-40"
          />
        </div>
        <div className="space-y-1.5 pt-4 border-t">
          <Label htmlFor="membershipDurationMonths">Membership Duration (months)</Label>
          <p className="text-sm text-muted-foreground">A paid membership is valid until today plus this many months.</p>
          <Input
            id="membershipDurationMonths"
            type="number"
            min={1}
            max={120}
            step="1"
            value={settings.membershipDurationMonths ?? 12}
            onChange={e => set('membershipDurationMonths', parseInt(e.target.value) || 12)}
            className="h-9 w-40"
          />
        </div>
      </CardContent>
    </Card>
  );
}
