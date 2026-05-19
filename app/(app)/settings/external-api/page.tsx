'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, PlusCircle, Pencil, Trash2, Send, ShieldCheck,
  Globe, AlertCircle, CheckCircle2, ArrowUpDown,
  ArrowUp, ArrowDown, RefreshCw, Cloud,
} from 'lucide-react';
import { getApiUrl } from '@/lib/api-config';
import type { ExternalApi, AllowedMethods, ApiRole } from '@/lib/external-api-config';
import type { ApiSyncLog } from '@/lib/services/api-sync-logger';

const METHODS_LABEL: Record<AllowedMethods, string> = {
  send_only: 'Send Only (POST)',
  receive_only: 'Receive Only (GET)',
  full_access: 'Full Access (GET + POST + PUT)',
};

const METHODS_BADGE: Record<AllowedMethods, { label: string; class: string }> = {
  send_only:    { label: 'Send Only',    class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  receive_only: { label: 'Receive Only', class: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  full_access:  { label: 'Full Access',  class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
};

const EMPTY_FORM: Omit<ExternalApi, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  description: '',
  enabled: false,
  apiEndpoint: '',
  authType: 'none',
  apiKey: '',
  bearerToken: '',
  allowedMethods: 'full_access',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 2000,
  syncMode: 'realtime',
  onErrorAction: 'log_only',
  role: 'general',
};

export default function ExternalApiSettingsPage() {
  const { toast } = useToast();

  const [apis, setApis] = useState<ExternalApi[]>([]);
  const [logs, setLogs] = useState<ApiSyncLog[]>([]);
  const [isLoadingApis, setIsLoadingApis] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApi, setEditingApi] = useState<ExternalApi | null>(null);
  const [form, setForm] = useState<Omit<ExternalApi, 'id' | 'createdAt' | 'updatedAt'>>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Test state per API id
  const [testingId, setTestingId] = useState<string | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<ExternalApi | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchApis();
    fetchLogs();
  }, []);

  const fetchApis = async () => {
    setIsLoadingApis(true);
    try {
      const res = await fetch(getApiUrl('/settings/external-api'));
      const data = await res.json();
      if (data.success) setApis(data.apis);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load APIs.' });
    } finally {
      setIsLoadingApis(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(getApiUrl('/external-api/logs?limit=50'));
      const data = await res.json();
      if (data.success) setLogs(data.logs);
    } catch {}
  };

  const openAddDialog = () => {
    setEditingApi(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (api: ExternalApi) => {
    setEditingApi(api);
    setForm({
      name: api.name,
      description: api.description ?? '',
      enabled: api.enabled,
      apiEndpoint: api.apiEndpoint,
      authType: api.authType,
      apiKey: api.apiKey ?? '',
      bearerToken: api.bearerToken ?? '',
      allowedMethods: api.allowedMethods,
      timeout: api.timeout,
      retryAttempts: api.retryAttempts,
      retryDelay: api.retryDelay,
      syncMode: api.syncMode,
      onErrorAction: api.onErrorAction,
      role: api.role ?? 'general',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Name is required.' });
      return;
    }
    if (!form.apiEndpoint.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'API Endpoint is required.' });
      return;
    }

    setIsSaving(true);
    try {
      let res: Response;
      if (editingApi) {
        res = await fetch(getApiUrl(`/settings/external-api/${editingApi.id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        res = await fetch(getApiUrl('/settings/external-api'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }

      const data = await res.json();
      if (data.success) {
        toast({ title: editingApi ? 'API Updated' : 'API Added', description: `"${form.name}" has been saved.` });
        setDialogOpen(false);
        fetchApis();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: data.error || 'Failed to save.' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Network error.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEnabled = async (api: ExternalApi) => {
    try {
      const res = await fetch(getApiUrl(`/settings/external-api/${api.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...api, enabled: !api.enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setApis(prev => prev.map(a => a.id === api.id ? { ...a, enabled: !a.enabled } : a));
      }
    } catch {}
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(getApiUrl(`/settings/external-api/${deleteTarget.id}`), { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'API Deleted', description: `"${deleteTarget.name}" has been removed.` });
        setApis(prev => prev.filter(a => a.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete API.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTestConnection = async (api: ExternalApi) => {
    setTestingId(api.id);
    try {
      const res = await fetch(getApiUrl(`/settings/external-api/${api.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          apiEndpoint: api.apiEndpoint,
          authType: api.authType,
          apiKey: api.apiKey,
          bearerToken: api.bearerToken,
          timeout: api.timeout,
          role: api.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Connection Successful', description: data.message });
      } else {
        toast({ variant: 'destructive', title: 'Connection Failed', description: data.error });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Test Failed', description: 'Network error.' });
    } finally {
      setTestingId(null);
    }
  };

  const pendingCount = logs.filter(l => l.status === 'pending').length;
  const hasCloudSync = apis.some(a => a.role === 'cloud_sync');

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">External API Integrations</h2>
        <Button onClick={openAddDialog}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add API
        </Button>
      </div>

      {!isLoadingApis && !hasCloudSync && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                <Cloud className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-blue-900 dark:text-blue-200">
                  Offline → Cloud Sync not configured
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Add an API entry and set its role to <strong>Cloud Sync</strong> to enable offline-first data sync to your Railway cloud backend.
                </p>
              </div>
              <Button variant="outline" size="sm" className="border-blue-300 hover:bg-blue-100 dark:border-blue-800 shrink-0" onClick={openAddDialog}>
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {pendingCount > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  {pendingCount} item{pendingCount !== 1 && 's'} waiting to sync
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  The system will automatically attempt to sync these in the background.
                </p>
              </div>
              <Button variant="outline" size="sm" className="border-amber-300 hover:bg-amber-100 dark:border-amber-800" onClick={fetchLogs}>
                Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="apis" className="space-y-4">
        <TabsList>
          <TabsTrigger value="apis">API Connections</TabsTrigger>
          <TabsTrigger value="logs">Sync Logs</TabsTrigger>
        </TabsList>

        {/* ── API LIST TAB ── */}
        <TabsContent value="apis" className="space-y-4">
          {isLoadingApis ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : apis.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-1">No APIs configured</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first external API to start sending or receiving data.
                </p>
                <Button onClick={openAddDialog}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add API
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {apis.map(api => {
                const methods = METHODS_BADGE[api.allowedMethods];
                return (
                  <Card key={api.id} className={!api.enabled ? 'opacity-60' : ''}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Enable toggle */}
                        <div className="pt-0.5">
                          <Switch
                            checked={api.enabled}
                            onCheckedChange={() => handleToggleEnabled(api)}
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-semibold text-base">{api.name}</span>
                            {api.role === 'cloud_sync' && (
                              <Badge variant="outline" className="bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 border-sky-300">
                                <Cloud className="mr-1 h-3 w-3" />
                                Cloud Sync
                              </Badge>
                            )}
                            <Badge variant="outline" className={methods.class}>
                              {api.allowedMethods === 'send_only'    && <ArrowUp   className="mr-1 h-3 w-3" />}
                              {api.allowedMethods === 'receive_only' && <ArrowDown  className="mr-1 h-3 w-3" />}
                              {api.allowedMethods === 'full_access'  && <ArrowUpDown className="mr-1 h-3 w-3" />}
                              {methods.label}
                            </Badge>
                            <Badge variant={api.enabled ? 'default' : 'secondary'}>
                              {api.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>

                          <p className="text-sm text-muted-foreground font-mono truncate mb-1">
                            {api.apiEndpoint}
                          </p>

                          {api.description && (
                            <p className="text-sm text-muted-foreground">{api.description}</p>
                          )}

                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                            <span>Auth: <span className="font-medium capitalize">{api.authType.replace('_', ' ')}</span></span>
                            <span>Sync: <span className="font-medium capitalize">{api.syncMode}</span></span>
                            <span>On Error: <span className="font-medium">{api.onErrorAction.replace('_', ' ')}</span></span>
                            <span>Timeout: <span className="font-medium">{(api.timeout / 1000).toFixed(0)}s</span></span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestConnection(api)}
                            disabled={testingId === api.id}
                          >
                            {testingId === api.id
                              ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              : <Send className="mr-1.5 h-3.5 w-3.5" />}
                            Test
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(api)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(api)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── SYNC LOGS TAB ── */}
        <TabsContent value="logs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Synchronization History</CardTitle>
                <CardDescription>Recent API calls and their status.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchLogs}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">Time</th>
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">Type</th>
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">Reference</th>
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">Status</th>
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">Attempts</th>
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">Next Retry</th>
                      <th className="h-12 px-4 text-left font-medium text-muted-foreground">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="h-24 text-center text-muted-foreground">
                          No sync logs found.
                        </td>
                      </tr>
                    ) : (
                      logs.map(log => (
                        <tr key={log.id} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4">{new Date(log.createdAt || '').toLocaleString()}</td>
                          <td className="p-4"><Badge variant="outline">{log.transactionType}</Badge></td>
                          <td className="p-4 font-mono text-xs">{log.transactionId}</td>
                          <td className="p-4">
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
                          <td className="p-4 text-center">{(log.retryCount ?? 0) + 1}</td>
                          <td className="p-4 text-xs">{log.nextRetryAt ? new Date(log.nextRetryAt).toLocaleTimeString() : '-'}</td>
                          <td className="p-4 max-w-[200px] truncate text-xs text-destructive">{log.errorMessage || '-'}</td>
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

      {/* ── ADD / EDIT DIALOG ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingApi ? 'Edit API' : 'Add New API'}</DialogTitle>
            <DialogDescription>
              {editingApi ? `Update the configuration for "${editingApi.name}".` : 'Configure a new external API connection.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Basic info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="api-name">Name <span className="text-destructive">*</span></Label>
                <Input
                  id="api-name"
                  placeholder="e.g., Accounting System"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>API Role</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as ApiRole }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        General API
                      </div>
                    </SelectItem>
                    <SelectItem value="cloud_sync">
                      <div className="flex items-center gap-2">
                        <Cloud className="h-4 w-4 text-sky-500" />
                        Cloud Sync (Offline → Railway)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.role === 'cloud_sync' && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 dark:bg-sky-950/20 dark:border-sky-900 p-3 text-sm text-sky-800 dark:text-sky-300">
                <strong>Cloud Sync mode:</strong> This entry will be used as the offline-first sync target.
                Set the <strong>Endpoint</strong> to your Railway app URL (e.g. <code>https://xxx.up.railway.app</code>)
                and use <strong>API Key</strong> auth with your shared <code>CLOUD_SYNC_API_KEY</code>.
                Only one Cloud Sync entry should be enabled at a time.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Allowed Methods <span className="text-destructive">*</span></Label>
                <Select value={form.allowedMethods} onValueChange={v => setForm(f => ({ ...f, allowedMethods: v as AllowedMethods }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="send_only">
                      <div className="flex items-center gap-2">
                        <ArrowUp className="h-4 w-4 text-blue-500" />
                        Send Only (POST) — push data to this API
                      </div>
                    </SelectItem>
                    <SelectItem value="receive_only">
                      <div className="flex items-center gap-2">
                        <ArrowDown className="h-4 w-4 text-purple-500" />
                        Receive Only (GET) — pull data from this API
                      </div>
                    </SelectItem>
                    <SelectItem value="full_access">
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4 text-emerald-500" />
                        Full Access (GET + POST + PUT)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="api-desc">Description (Optional)</Label>
              <Textarea
                id="api-desc"
                placeholder="What is this API used for?"
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Endpoint */}
            <div className="space-y-2">
              <Label htmlFor="api-endpoint">API Endpoint URL <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="api-endpoint"
                  className="pl-9"
                  placeholder="https://api.example.com"
                  value={form.apiEndpoint}
                  onChange={e => setForm(f => ({ ...f, apiEndpoint: e.target.value }))}
                />
              </div>
            </div>

            {/* Auth */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Authentication Type</Label>
                <Select value={form.authType} onValueChange={v => setForm(f => ({ ...f, authType: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="api_key">API Key (X-API-Key)</SelectItem>
                    <SelectItem value="bearer_token">Bearer Token</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.authType === 'api_key' && (
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="api-key"
                      type="password"
                      className="pl-9"
                      placeholder="Enter API key"
                      value={form.apiKey}
                      onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {form.authType === 'bearer_token' && (
                <div className="space-y-2">
                  <Label htmlFor="bearer-token">Bearer Token</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="bearer-token"
                      type="password"
                      className="pl-9"
                      placeholder="Enter bearer token"
                      value={form.bearerToken}
                      onChange={e => setForm(f => ({ ...f, bearerToken: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sync behaviour */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Sync Mode</Label>
                <Select value={form.syncMode} onValueChange={v => setForm(f => ({ ...f, syncMode: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="batch">Batch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>On Error Action</Label>
                <Select value={form.onErrorAction} onValueChange={v => setForm(f => ({ ...f, onErrorAction: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="log_only">Log Error Only</SelectItem>
                    <SelectItem value="retry">Automatic Retry</SelectItem>
                    <SelectItem value="queue">Queue for Manual Sync</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (ms)</Label>
                <Input
                  id="timeout"
                  type="number"
                  min={1000}
                  step={1000}
                  value={form.timeout}
                  onChange={e => setForm(f => ({ ...f, timeout: parseInt(e.target.value) || 30000 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="retry-attempts">Retry Attempts</Label>
                <Input
                  id="retry-attempts"
                  type="number"
                  min={0}
                  max={10}
                  value={form.retryAttempts}
                  onChange={e => setForm(f => ({ ...f, retryAttempts: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retry-delay">Retry Delay (ms)</Label>
                <Input
                  id="retry-delay"
                  type="number"
                  min={500}
                  step={500}
                  value={form.retryDelay}
                  onChange={e => setForm(f => ({ ...f, retryDelay: parseInt(e.target.value) || 2000 }))}
                />
              </div>
            </div>

            {/* Enable toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Enable this API</Label>
                <p className="text-sm text-muted-foreground">Active APIs will be used for sync operations.</p>
              </div>
              <Switch checked={form.enabled} onCheckedChange={v => setForm(f => ({ ...f, enabled: v }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingApi ? 'Save Changes' : 'Add API'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this API configuration. Any sync operations using it will stop.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
