'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import type { ApiSyncLog } from '@/lib/services/api-sync-logger';

interface Props {
  logs: ApiSyncLog[];
  isLoading: boolean;
  logStatusFilter: string;
  onStatusFilterChange: (v: string) => void;
  onRefresh: () => void;
  retryingLogId: string | null;
  onRetry: (log: ApiSyncLog) => void;
}

export function SyncLogsTab({ logs, isLoading, logStatusFilter, onStatusFilterChange, onRefresh, retryingLogId, onRetry }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Synchronization History</CardTitle>
          <CardDescription>Recent API calls and their status.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={logStatusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b">
                {['Time', 'Type', 'Reference', 'Status', 'Attempts', 'Next Retry', 'Error', 'Action'].map(h => (
                  <th key={h} className="h-12 px-4 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={8} className="h-24 text-center text-muted-foreground">No sync logs found.</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="p-4 text-xs">{new Date(log.createdAt || '').toLocaleString()}</td>
                  <td className="p-4"><Badge variant="outline">{log.transactionType}</Badge></td>
                  <td className="p-4 font-mono text-xs">{log.transactionId}</td>
                  <td className="p-4">
                    {log.status === 'success' ? (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600"><CheckCircle2 className="mr-1 h-3 w-3" /> Success</Badge>
                    ) : log.status === 'failed' ? (
                      <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" /> Failed</Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </td>
                  <td className="p-4 text-center">{(log.retryCount ?? 0) + 1}</td>
                  <td className="p-4 text-xs">{log.nextRetryAt ? new Date(log.nextRetryAt).toLocaleTimeString() : '-'}</td>
                  <td className="p-4 max-w-[200px] truncate text-xs text-destructive">{log.errorMessage || '-'}</td>
                  <td className="p-4">
                    {(log.status === 'failed' || log.status === 'pending') && (
                      <Button variant="outline" size="sm" onClick={() => onRetry(log)} disabled={retryingLogId === log.id}>
                        {retryingLogId === log.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
