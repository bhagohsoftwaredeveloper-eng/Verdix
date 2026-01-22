'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Globe, Clock, Calendar } from 'lucide-react';
import Link from 'next/link';

interface SystemSettings {
  currencySymbol: string;
  currencyCode: string;
  timezone: string;
  dateFormat: string;
}

export default function SystemPreferencesPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    currencySymbol: '$',
    currencyCode: 'USD',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/pos-settings');
      const result = await response.json();
      
      if (result.success) {
        setSettings({
            currencySymbol: result.data.currencySymbol || '$',
            currencyCode: result.data.currencyCode || 'USD',
            timezone: result.data.timezone || 'UTC',
            dateFormat: result.data.dateFormat || 'MM/DD/YYYY'
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load system preferences'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      
      const response = await fetch('/api/pos-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Settings Saved',
          description: 'System preferences have been updated successfully'
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save system preferences'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">System Preferences</h2>
            <p className="text-muted-foreground">
                Manage global application settings for localization and formats.
            </p>
        </div>
        <div className="flex items-center space-x-2">
            <Link href="/settings">
                <Button variant="outline">Cancel</Button>
            </Link>
            <Button onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? (
                <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
                </>
            ) : (
                'Save Changes'
            )}
            </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
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
              <Select
                value={settings.currencySymbol}
                onValueChange={(value) => setSettings(prev => ({ ...prev, currencySymbol: value }))}
              >
                <SelectTrigger id="currencySymbol">
                  <SelectValue placeholder="Select symbol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="$">$ (Dollar)</SelectItem>
                  <SelectItem value="€">€ (Euro)</SelectItem>
                  <SelectItem value="£">£ (Pound)</SelectItem>
                  <SelectItem value="₱">₱ (Peso)</SelectItem>
                  <SelectItem value="¥">¥ (Yen/Yuan)</SelectItem>
                  <SelectItem value="₹">₹ (Rupee)</SelectItem>
                  <SelectItem value="₩">₩ (Won)</SelectItem>
                  <SelectItem value="₫">₫ (Dong)</SelectItem>
                  <SelectItem value="฿">฿ (Baht)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The symbol displayed before amounts
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currencyCode">Currency Code</Label>
              <Select
                value={settings.currencyCode}
                onValueChange={(value) => setSettings(prev => ({ ...prev, currencyCode: value }))}
              >
                <SelectTrigger id="currencyCode">
                  <SelectValue placeholder="Select code" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="PHP">PHP - Philippine Peso</SelectItem>
                  <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                  <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                  <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                  <SelectItem value="KRW">KRW - South Korean Won</SelectItem>
                  <SelectItem value="VND">VND - Vietnamese Dong</SelectItem>
                  <SelectItem value="THB">THB - Thai Baht</SelectItem>
                  <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                ISO 4217 currency code used for reporting
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Date & Time
            </CardTitle>
            <CardDescription>Set your preferred timezone and date formats</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select 
                value={settings.timezone} 
                onValueChange={(value) => setSettings(prev => ({ ...prev, timezone: value }))}
              >
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
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
               <Select 
                value={settings.dateFormat} 
                onValueChange={(value) => setSettings(prev => ({ ...prev, dateFormat: value }))}
              >
                <SelectTrigger id="dateFormat">
                  <SelectValue placeholder="Select date format" />
                </SelectTrigger>
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
      </div>
    </div>
  );
}
