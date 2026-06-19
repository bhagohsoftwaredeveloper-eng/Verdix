'use client';

import { TableCell, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export function PurchaseOrderSkeleton() {
  return (
    <TableRow>
      <TableCell className="w-12"><Skeleton className="h-5 w-5 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell className="px-2 py-1 text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
      <TableCell className="px-2 py-1 text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
      <TableCell className="px-2 py-1 text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
      <TableCell className="px-2 py-1 text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
      <TableCell className="px-2 py-1 text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
    </TableRow>
  );
}
