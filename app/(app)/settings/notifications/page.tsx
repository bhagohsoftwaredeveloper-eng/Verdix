'use client';

import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useNotifications } from './use-notifications';
import { InventoryAlertsCard } from './InventoryAlertsCard';
import { NotificationChannelsCard } from './NotificationChannelsCard';

export default function NotificationsPage() {
  const { settings, set, isLoading, isSaving, handleSave } = useNotifications();

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
          <p className="text-muted-foreground">Manage how you receive alerts and status updates.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/settings"><Button variant="outline">Cancel</Button></Link>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <InventoryAlertsCard
          lowStockThreshold={settings.lowStockThreshold}
          onChange={v => set('lowStockThreshold', v)}
        />
        <NotificationChannelsCard
          enablePushNotifications={settings.enablePushNotifications}
          enableEmailNotifications={settings.enableEmailNotifications}
          notificationEmail={settings.notificationEmail}
          set={set}
        />
      </div>
    </div>
  );
}
