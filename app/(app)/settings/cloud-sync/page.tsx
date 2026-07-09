'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/api-config';
import {
  CloudCog,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  ListTodo,
} from 'lucide-react';

type SyncGateReason = 'ok' | 'not_configured' | 'not_licensed' | 'disabled';

interface CloudSyncStatus {
  isConfigured: boolean;
  isLicensed: boolean;
  isEnabled: boolean;
  gateReason: SyncGateReason;
  isOnline: boolean;
  lastPush: string | null;
  lastPull: string | null;
  pendingTables: number;
}

const DEFAULT_STATUS: CloudSyncStatus = {
  isConfigured: false,
  isLicensed: false,
  isEnabled: false,
  gateReason: 'not_configured',
  isOnline: false,
  lastPush: null,
  lastPull: null,
  pendingTables: 0,
};

function formatTimestamp(value: string | null): string {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';
  return date.toLocaleString();
}

function GateRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium">{label}</span>
      {ok ? (
        <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          Yes
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
          <XCircle className="h-4 w-4" />
          No
        </span>
      )}
    </div>
  );
}

export default function CloudSyncSettingsPage() {
  const { toast } = useToast();
  const [status, setStatus] = useState<CloudSyncStatus>(DEFAULT_STATUS);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl('/cloud-sync/status'));
      const result = await res.json();
      if (!res.ok || !result.ok) throw new Error(result.error || 'Failed to load status');
      setStatus({
        isConfigured: Boolean(result.isConfigured),
        isLicensed: Boolean(result.isLicensed),
        isEnabled: Boolean(result.isEnabled),
        gateReason: result.gateReason,
        isOnline: Boolean(result.isOnline),
        lastPush: result.lastPush ?? null,
        lastPull: result.lastPull ?? null,
        pendingTables: Number(result.pendingTables ?? 0),
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Could not load cloud sync status',
        description: err?.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleToggle = async (enabled: boolean) => {
    setIsToggling(true);
    try {
      const res = await fetch(getApiUrl('/cloud-sync/toggle'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) throw new Error(result.error || 'Failed to update cloud sync');
      toast({
        title: enabled ? 'Cloud sync enabled' : 'Cloud sync paused',
        description: enabled
          ? 'This machine will push and pull data with the cloud again.'
          : 'This machine will stop syncing until you turn it back on.',
      });
      await fetchStatus();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Could not update cloud sync',
        description: err?.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsToggling(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(getApiUrl('/cloud-sync/run'), { method: 'POST' });
      const result = await res.json();
      if (!res.ok || !result.ok) throw new Error(result.error || 'Sync failed');
      toast({
        title: 'Sync complete',
        description: `Pushed ${result.pushed?.pushed ?? 0}, pulled ${result.pulled?.pulled ?? 0}`,
      });
      await fetchStatus();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Sync failed',
        description: err?.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const toggleDisabled =
    isToggling || status.gateReason === 'not_configured' || status.gateReason === 'not_licensed';

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Cloud Sync</h2>
          <p className="text-muted-foreground">
            Enable or disable cloud sync and see when this machine last exchanged data.
          </p>
        </div>
      </div>

      <div className="grid gap-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudCog className="h-5 w-5" />
              Status
            </CardTitle>
            <CardDescription>The current state of the cloud connection on this machine</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              <GateRow label="Configured" ok={status.isConfigured} />
              <GateRow label="Licensed" ok={status.isLicensed} />
              <GateRow label="Enabled" ok={status.isEnabled} />
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium">Online</span>
                {status.isOnline ? (
                  <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                    <Wifi className="h-4 w-4" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <WifiOff className="h-4 w-4" />
                    Offline
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-md border p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ArrowUpCircle className="h-3.5 w-3.5" />
                  Last push
                </div>
                <div className="mt-1 text-sm font-medium">{formatTimestamp(status.lastPush)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ArrowDownCircle className="h-3.5 w-3.5" />
                  Last pull
                </div>
                <div className="mt-1 text-sm font-medium">{formatTimestamp(status.lastPull)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ListTodo className="h-3.5 w-3.5" />
                  Pending tables
                </div>
                <div className="mt-1 text-sm font-medium">{status.pendingTables}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudCog className="h-5 w-5" />
              Enable Cloud Sync
            </CardTitle>
            <CardDescription>Turn cloud sync on or off for this machine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1">
                <Label>Sync with cloud</Label>
                <span className="text-xs text-muted-foreground">
                  When on, this machine pushes and pulls data with the cloud database on a schedule.
                </span>
              </div>
              <Switch
                checked={status.isEnabled}
                disabled={toggleDisabled}
                onCheckedChange={handleToggle}
              />
            </div>

            {status.gateReason === 'not_configured' && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Cloud database is not configured (set CLOUD_DB_* in .env).
              </p>
            )}
            {status.gateReason === 'not_licensed' && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                License lacks the cloud-sync feature — run cloud:provision and re-activate.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Sync Now
            </CardTitle>
            <CardDescription>Push and pull data with the cloud right away</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSyncNow} disabled={isSyncing || status.gateReason !== 'ok'}>
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Now
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
