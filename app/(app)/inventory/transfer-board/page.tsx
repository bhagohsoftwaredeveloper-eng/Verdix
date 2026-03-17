'use client';

import { Suspense } from 'react';
import { TransferBoard } from "./TransferBoard";
import { Skeleton } from '@/components/ui/skeleton';
import { AppBreadcrumbs } from '@/components/app-breadcrumbs';

export default function TransferBoardPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stock Transfer Board</h2>
          <p className="text-muted-foreground">
            Drag and drop products between warehouses to transfer stock.
          </p>
        </div>
      </div>
      <Suspense fallback={<TransferBoardSkeleton />}>
        <TransferBoard />
      </Suspense>
    </div>
  );
}

function TransferBoardSkeleton() {
  return (
    <div className="flex h-[calc(100vh-210px)] gap-6 overflow-x-auto pb-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex h-full w-72 min-w-[280px] max-w-[280px] flex-shrink-0 flex-col gap-4 rounded-lg bg-muted/30 p-4">
          <Skeleton className="h-8 w-1/2" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-32 w-full rounded-md" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
