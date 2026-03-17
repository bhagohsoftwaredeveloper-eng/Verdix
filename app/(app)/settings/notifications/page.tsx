'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Bell, Mail, Smartphone, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/api-config';

interface NotificationSettings {
  lowStockThreshold: number;
  enableEmailNotifications: boolean;
  notificationEmail: string;
  enablePushNotifications: boolean;
}

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    lowStockThreshold: 10,
    enableEmailNotifications: false,
    notificationEmail: '',
    enablePushNotifications: true,
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
      const response = await fetch(getApiUrl('/pos-settings'));
      const result = await response.json();
      
      if (result.success) {
        setSettings({
          lowStockThreshold: result.data.lowStockThreshold ?? 10,
          enableEmailNotifications: Boolean(result.data.enableEmailNotifications),
          notificationEmail: result.data.notificationEmail || '',
          enablePushNotifications: Boolean(result.data.enablePushNotifications),
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load notification settings'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      
      const response = await fetch(getApiUrl('/pos-settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Settings Saved',
          description: 'Notification preferences have been updated successfully'
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save notification settings'
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
            <h2 className="text-3xl font-bold tracking-tight">Notification Settings</h2>
            <p className="text-muted-foreground">
                Manage how you receive alerts and status updates.
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
                value={settings.lowStockThreshold}
                onChange={(e) => setSettings(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) }))}
              />
              <p className="text-xs text-muted-foreground">
                Alert me when product stock falls below this number.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Channels
            </CardTitle>
            <CardDescription>Choose where you want to receive alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1">
                <Label className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Push Notifications
                </Label>
                <span className="text-xs text-muted-foreground">Receive alerts in your browser</span>
              </div>
              <Switch
                checked={settings.enablePushNotifications}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enablePushNotifications: checked }))}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between space-x-2">
                <div className="flex flex-col space-y-1">
                    <Label className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Notifications
                    </Label>
                    <span className="text-xs text-muted-foreground">Send periodic alerts to your email</span>
                </div>
                <Switch
                    checked={settings.enableEmailNotifications}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableEmailNotifications: checked }))}
                />
              </div>
              
              {settings.enableEmailNotifications && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="notificationEmail">Recipient Email</Label>
                  <Input
                    id="notificationEmail"
                    placeholder="notifications@example.com"
                    value={settings.notificationEmail}
                    onChange={(e) => setSettings(prev => ({ ...prev, notificationEmail: e.target.value }))}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
