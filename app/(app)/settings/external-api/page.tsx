'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Send, ShieldCheck, Globe, History, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalApiConfig, DEFAULT_EXTERNAL_API_CONFIG } from '@/lib/external-api-config';
import { getApiUrl } from '@/lib/api-config';
import type { ApiSyncLog } from '@/lib/services/api-sync-logger';

export default function ExternalApiSettingsPage() {
  const [config, setConfig] = useState<ExternalApiConfig>(DEFAULT_EXTERNAL_API_CONFIG);
  const [logs, setLogs] = useState<ApiSyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfig();
    fetchLogs();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch(getApiUrl('/settings/external-api'));
      const data = await response.json();
      if (data.success) {
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch(getApiUrl('/external-api/logs?limit=50'));
      const data = await response.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const pendingCount = logs.filter(l => l.status === 'pending').length;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(getApiUrl('/settings/external-api'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Settings Saved',
          description: 'External API configuration has been updated.',
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error.message || 'There was a problem saving your settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.apiEndpoint) {
      toast({
        variant: 'destructive',
        title: 'Missing Endpoint',
        description: 'Please provide an API endpoint to test.',
      });
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(getApiUrl('/settings/external-api'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Connection Successful',
          description: data.message || 'The external server responded correctly.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Connection Failed',
          description: data.error || 'The external server could not be reached or returned an error.',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Test Failed',
        description: error.message || 'An unexpected error occurred during the test.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">External API Integration</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
            {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Test Connection
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      {pendingCount > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  {pendingCount} item{pendingCount === 1 ? '' : 's'} waiting to be synced
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  The system will automatically attempt to sync these items in the background.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-amber-300 hover:bg-amber-100 dark:border-amber-800"
                onClick={fetchLogs}
              >
                Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="configuration" className="space-y-4">
        <TabsList>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="logs">Sync Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>API Connection</CardTitle>
                <CardDescription>
                  Configure how Stock_Pilot connects to your external accounting server.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Enable Integration</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync purchases and accounts payable to the external server.
                    </p>
                  </div>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiEndpoint">API Endpoint URL</Label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="apiEndpoint"
                        placeholder="https://accounting.yourcompany.com/api"
                        className="pl-9"
                        value={config.apiEndpoint}
                        onChange={(e) => setConfig({ ...config, apiEndpoint: e.target.value })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The base URL of the accounting system API.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="authType">Authentication Type</Label>
                    <Select
                      value={config.authType}
                      onValueChange={(val: any) => setConfig({ ...config, authType: val })}
                    >
                      <SelectTrigger id="authType">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="api_key">API Key (X-API-Key)</SelectItem>
                        <SelectItem value="bearer_token">Bearer Token</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {config.authType === 'api_key' && (
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">API Key</Label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="apiKey"
                          type="password"
                          className="pl-9"
                          value={config.apiKey || ''}
                          onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {config.authType === 'bearer_token' && (
                    <div className="space-y-2">
                      <Label htmlFor="bearerToken">Bearer Token</Label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="bearerToken"
                          type="password"
                          className="pl-9"
                          value={config.bearerToken || ''}
                          onChange={(e) => setConfig({ ...config, bearerToken: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Sync Behavior</CardTitle>
                <CardDescription>
                  Adjust how data is synchronized and handled.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Sync Mode</Label>
                    <Select
                      value={config.syncMode}
                      onValueChange={(val: any) => setConfig({ ...config, syncMode: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Real-time (Immediate)</SelectItem>
                        <SelectItem value="batch">Interval (Batch Support Planned)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>On Error Action</Label>
                    <Select
                      value={config.onErrorAction}
                      onValueChange={(val: any) => setConfig({ ...config, onErrorAction: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="log_only">Log Error Only</SelectItem>
                        <SelectItem value="retry">Automatic Retry</SelectItem>
                        <SelectItem value="queue">Queue for Manual Sync</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="retryAttempts">Retry Attempts</Label>
                      <Input
                        id="retryAttempts"
                        type="number"
                        min="0"
                        max="5"
                        value={config.retryAttempts}
                        onChange={(e) => setConfig({ ...config, retryAttempts: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timeout">Timeout (ms)</Label>
                      <Input
                        id="timeout"
                        type="number"
                        min="1000"
                        step="1000"
                        value={config.timeout}
                        onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Synchronization History</CardTitle>
                <CardDescription>
                  View recent API calls and their status.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchLogs}>
                <History className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Time</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Reference</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Attempts</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Next Retry</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Error</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="h-24 text-center">
                          No sync logs found.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 align-middle">
                            {new Date(log.createdAt || '').toLocaleString()}
                          </td>
                          <td className="p-4 align-middle">
                            <Badge variant="outline">{log.transactionType}</Badge>
                          </td>
                          <td className="p-4 align-middle font-mono text-xs">
                            {log.transactionId}
                          </td>
                          <td className="p-4 align-middle">
                            {log.status === 'success' ? (
                              <Badge className="bg-emerald-500 hover:bg-emerald-600">
                                <CheckCircle2 className="mr-1 h-3 w-3" /> Success
                              </Badge>
                            ) : log.status === 'failed' ? (
                              <Badge variant="destructive">
                                <AlertCircle className="mr-1 h-3 w-3" /> Failed
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </td>
                          <td className="p-4 align-middle text-center">
                            {log.retryCount + 1}
                          </td>
                          <td className="p-4 align-middle text-xs">
                            {log.nextRetryAt ? new Date(log.nextRetryAt).toLocaleTimeString() : '-'}
                          </td>
                          <td className="p-4 align-middle max-w-[200px] truncate text-xs text-destructive">
                            {log.errorMessage || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
