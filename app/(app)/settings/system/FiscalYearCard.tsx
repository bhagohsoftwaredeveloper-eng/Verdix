'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { type SystemSettings } from './system-types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type Props = {
  settings: SystemSettings;
  set: <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void;
};

export function FiscalYearCard({ settings, set }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Fiscal Year
        </CardTitle>
        <CardDescription>Configure your financial year reporting period</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fiscalYearStartMonth">Fiscal Year Start Month</Label>
          <Select
            value={settings.fiscalYearStartMonth.toString()}
            onValueChange={v => set('fiscalYearStartMonth', parseInt(v))}
          >
            <SelectTrigger id="fiscalYearStartMonth"><SelectValue placeholder="Select start month" /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((month, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The month when your business&apos;s financial year begins.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
