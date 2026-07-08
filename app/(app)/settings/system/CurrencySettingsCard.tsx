'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe } from 'lucide-react';
import { CURRENCIES, type SystemSettings } from './system-types';

type Props = {
  settings: SystemSettings;
  setCurrency: (key: 'symbol' | 'code', value: string) => void;
};

const uniqueSymbols = Array.from(new Set(CURRENCIES.map(c => c.symbol)));

export function CurrencySettingsCard({ settings, setCurrency }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Currency Settings
        </CardTitle>
        <CardDescription>Configure how currency is displayed throughout the application</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currencySymbol">Currency Symbol</Label>
          <Select value={settings.currencySymbol} onValueChange={v => setCurrency('symbol', v)}>
            <SelectTrigger id="currencySymbol"><SelectValue placeholder="Select symbol" /></SelectTrigger>
            <SelectContent>
              {uniqueSymbols.map(symbol => (
                <SelectItem key={symbol} value={symbol}>
                  {symbol} ({CURRENCIES.find(c => c.symbol === symbol)?.name.split(' ').pop()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">The symbol displayed before amounts</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="currencyCode">Currency Code</Label>
          <Select value={settings.currencyCode} onValueChange={v => setCurrency('code', v)}>
            <SelectTrigger id="currencyCode"><SelectValue placeholder="Select code" /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(curr => (
                <SelectItem key={curr.code} value={curr.code}>
                  {curr.code} - {curr.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">ISO 4217 currency code used for reporting</p>
        </div>
      </CardContent>
    </Card>
  );
}
