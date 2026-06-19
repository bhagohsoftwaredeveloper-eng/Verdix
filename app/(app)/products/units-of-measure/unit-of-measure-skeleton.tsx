'use client';

import { TableCell, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export function UnitOfMeasureSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-5 w-32" />
      </TableCell>
       <TableCell>
        <Skeleton className="h-5 w-24" />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
        </div>
      </TableCell>
    </TableRow>
  );
}
