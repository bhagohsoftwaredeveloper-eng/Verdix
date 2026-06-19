'use client';

import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { ClipboardList, Eye, Play } from 'lucide-react';

import { statusClass, LocationLabel } from './status-utils';
import { StockCountCard, SkeletonCard } from './stock-count-card';
import { Pagination } from './pagination';
import { NewCountDialog } from './new-count-dialog';
import { useStockCounts } from './use-stock-counts';

export function StockCountsClient() {
  const {
    isLoading,
    search,
    setSearch,
    setPage,
    pageSize,
    setPageSize,
    fetchCounts,
    filtered,
    safePage,
    paginated,
    handleOpen,
  } = useStockCounts();

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <Input
          placeholder="Search counts..."
          className="w-full sm:w-80"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <NewCountDialog onCreated={fetchCounts} />
      </div>

      {/* ── Mobile card grid ── */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : filtered.length === 0
          ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
              {search ? `No counts matching "${search}"` : 'No stock counts yet.'}
            </div>
          )
          : paginated.map((count) => (
            <StockCountCard key={count.id} count={count} onOpen={handleOpen} />
          ))}
      </div>

      {/* Mobile pagination */}
      {!isLoading && filtered.length > 0 && (
        <div className="md:hidden">
          <Pagination
            total={filtered.length} page={safePage} pageSize={pageSize}
            onPageChange={setPage} onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* ── Desktop table ── */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Name/Reference</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {search ? `No counts matching "${search}"` : 'No stock counts found.'}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((count) => (
                <TableRow key={count.id}>
                  <TableCell>
                    {count.createdAt ? format(new Date(count.createdAt), 'PPP') : 'N/A'}
                  </TableCell>
                  <TableCell className="font-medium">{count.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <LocationLabel count={count} />
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass(count.status)}`}>
                      {count.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>{count.createdBy}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleOpen(count.id)}>
                      {count.status === 'in_progress'
                        ? <><Play className="h-4 w-4 mr-2" />Continue</>
                        : <><Eye className="h-4 w-4 mr-2" />View</>}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Desktop pagination */}
        {!isLoading && filtered.length > 0 && (
          <div className="border-t px-4 py-3">
            <Pagination
              total={filtered.length} page={safePage} pageSize={pageSize}
              onPageChange={setPage} onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>
    </div>
  );
}
