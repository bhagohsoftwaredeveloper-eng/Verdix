'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { format } from 'date-fns';
import { ActivityLog, MODULE_COLORS, ACTION_COLORS } from './user-logs-types';

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

type Props = {
  logs: ActivityLog[];
  isLoading: boolean;
  total: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  setPage: (p: number) => void;
  setPageSize: (s: number) => void;
};

export function UserLogsTable({ logs, isLoading, total, currentPage, totalPages, pageSize, setPage, setPageSize }: Props) {
  return (
    <>
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
            {isLoading && Array.from({ length: 8 }).map((_, i) => <LogSkeleton key={i} />)}

            {!isLoading && logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No activity logs found.
                </TableCell>
              </TableRow>
            )}

            {!isLoading && logs.map(log => (
              <TableRow key={log.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                </TableCell>
                <TableCell className="text-sm font-medium">{log.user_name}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${MODULE_COLORS[log.module] ?? 'bg-gray-100 text-gray-700'}`}>
                    {log.module}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-700'}`}>
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
            setPage={setPage}
            setPageSize={setPageSize}
          />
        </div>
      )}
    </>
  );
}
