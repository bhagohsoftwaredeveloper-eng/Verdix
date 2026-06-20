'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell, Mail, Smartphone } from 'lucide-react';
import type { NotificationSettings } from './notification-types';

type SetFn = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => void;

interface Props {
  enablePushNotifications: boolean;
  enableEmailNotifications: boolean;
  notificationEmail: string;
  set: SetFn;
}

export function NotificationChannelsCard({ enablePushNotifications, enableEmailNotifications, notificationEmail, set }: Props) {
  return (
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
            <Label className="flex items-center gap-2"><Smartphone className="h-4 w-4" />Push Notifications</Label>
            <span className="text-xs text-muted-foreground">Receive alerts in your browser</span>
          </div>
          <Switch checked={enablePushNotifications} onCheckedChange={v => set('enablePushNotifications', v)} />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between space-x-2">
            <div className="flex flex-col space-y-1">
              <Label className="flex items-center gap-2"><Mail className="h-4 w-4" />Email Notifications</Label>
              <span className="text-xs text-muted-foreground">Send periodic alerts to your email</span>
            </div>
            <Switch checked={enableEmailNotifications} onCheckedChange={v => set('enableEmailNotifications', v)} />
          </div>

          {enableEmailNotifications && (
            <div className="space-y-2 pl-6">
              <Label htmlFor="notificationEmail">Recipient Email</Label>
              <Input
                id="notificationEmail"
                placeholder="notifications@example.com"
                value={notificationEmail}
                onChange={e => set('notificationEmail', e.target.value)}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
