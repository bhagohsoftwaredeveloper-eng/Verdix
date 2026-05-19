'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Search, X, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

type ActivityLog = {
  id: string;
  user_uid: string;
  user_name: string;
  action: string;
  module: string;
  description: string;
  reference_id: string | null;
  created_at: string;
};

const MODULE_OPTIONS = [
  'ALL',
  'INVENTORY',
  'SALES',
  'CUSTOMERS',
  'PURCHASES',
  'SUPPLIERS',
  'PRODUCTS',
  'USERS',
  'POS',
  'SETTINGS',
];

const ACTION_OPTIONS = [
  'ALL',
  'CREATE',
  'UPDATE',
  'DELETE',
  'ENABLE',
  'DISABLE',
  'RECEIVE',
  'VOID',
  'ADJUST',
  'TRANSFER',
  'LOGIN',
  'LOGOUT',
];

const MODULE_COLORS: Record<string, string> = {
  INVENTORY: 'bg-blue-100 text-blue-700',
  SALES: 'bg-green-100 text-green-700',
  CUSTOMERS: 'bg-purple-100 text-purple-700',
  PURCHASES: 'bg-orange-100 text-orange-700',
  SUPPLIERS: 'bg-yellow-100 text-yellow-700',
  PRODUCTS: 'bg-cyan-100 text-cyan-700',
  USERS: 'bg-pink-100 text-pink-700',
  POS: 'bg-indigo-100 text-indigo-700',
  SETTINGS: 'bg-gray-100 text-gray-700',
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  ENABLE: 'bg-emerald-100 text-emerald-700',
  DISABLE: 'bg-rose-100 text-rose-700',
  RECEIVE: 'bg-teal-100 text-teal-700',
  VOID: 'bg-red-100 text-red-700',
  ADJUST: 'bg-amber-100 text-amber-700',
  TRANSFER: 'bg-violet-100 text-violet-700',
  LOGIN: 'bg-sky-100 text-sky-700',
  LOGOUT: 'bg-slate-100 text-slate-700',
};

function LogSkeleton() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-4 w-64" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
    </TableRow>
  );
}

export function UserLogsTab() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String((currentPage - 1) * pageSize),
      });

      if (moduleFilter !== 'ALL') params.set('module', moduleFilter);
      if (actionFilter !== 'ALL') params.set('action', actionFilter);
      if (activeSearch) params.set('search', activeSearch);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
      const res = await fetch(`${base}/user-activity-logs?${params.toString()}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, moduleFilter, actionFilter, activeSearch, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = () => {
    setActiveSearch(searchQuery);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setActiveSearch('');
    setModuleFilter('ALL');
    setActionFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);
  const hasActiveFilters =
    activeSearch || moduleFilter !== 'ALL' || actionFilter !== 'ALL' || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Input
            placeholder="Search description, user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pr-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
              onClick={() => { setSearchQuery(''); setActiveSearch(''); setCurrentPage(1); }}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>

        <Button size="icon" variant="secondary" onClick={handleSearch}>
          <Search className="h-4 w-4" />
        </Button>

        <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Module" />
          </SelectTrigger>
          <SelectContent>
            {MODULE_OPTIONS.map((m) => (
              <SelectItem key={m} value={m}>
                {m === 'ALL' ? 'All Modules' : m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_OPTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {a === 'ALL' ? 'All Actions' : a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
            className="w-[140px] text-sm"
            placeholder="From"
          />
          <span className="text-muted-foreground text-sm">–</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
            className="w-[140px] text-sm"
            placeholder="To"
          />
        </div>

        <Button size="icon" variant="ghost" onClick={fetchLogs} title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>

        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-md max-h-[520px] overflow-y-auto relative">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[160px]">Timestamp</TableHead>
              <TableHead className="w-[160px]">User</TableHead>
              <TableHead className="w-[110px]">Module</TableHead>
              <TableHead className="w-[100px]">Action</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[120px]">Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => <LogSkeleton key={i} />)}

            {!isLoading && logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No activity logs found.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {log.user_name}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        MODULE_COLORS[log.module] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {log.module}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {log.action}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm max-w-xs">
                    <span className="line-clamp-2">{log.description}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {log.reference_id || '—'}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {!isLoading && total > 0 && (
        <div className="py-2 px-1 border-t">
          <DataTablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={total}
            setPage={setCurrentPage}
            setPageSize={setPageSize}
          />
        </div>
      )}
    </div>
  );
}
