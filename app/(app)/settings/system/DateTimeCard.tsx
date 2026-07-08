'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock } from 'lucide-react';
import { type SystemSettings } from './system-types';

type Props = {
  settings: SystemSettings;
  set: <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void;
};

export function DateTimeCard({ settings, set }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Date &amp; Time
        </CardTitle>
        <CardDescription>Set your preferred timezone and date formats</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select value={settings.timezone} onValueChange={v => set('timezone', v)}>
            <SelectTrigger id="timezone"><SelectValue placeholder="Select timezone" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
              <SelectItem value="Asia/Manila">Asia/Manila (PHT)</SelectItem>
              <SelectItem value="America/New_York">America/New_York (EST/EDT)</SelectItem>
              <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</SelectItem>
              <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
              <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
              <SelectItem value="Australia/Sydney">Australia/Sydney (AEDT)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateFormat">Date Format</Label>
          <Select value={settings.dateFormat} onValueChange={v => set('dateFormat', v)}>
            <SelectTrigger id="dateFormat"><SelectValue placeholder="Select date format" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (e.g. 12/31/2024)</SelectItem>
              <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (e.g. 31/12/2024)</SelectItem>
              <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2024-12-31)</SelectItem>
              <SelectItem value="MMM D, YYYY">MMM D, YYYY (e.g. Dec 31, 2024)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
