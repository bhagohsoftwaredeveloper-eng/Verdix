import { Suspense } from 'react';
import { CountDetailClient } from './CountDetailClient';
import { Skeleton } from '@/components/ui/skeleton';

export default async function StockCountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Suspense fallback={<CountDetailSkeleton />}>
        <CountDetailClient countId={resolvedParams.id} />
      </Suspense>
    </div>
  );
}

function CountDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="flex justify-between">
         <Skeleton className="h-10 w-96" />
         <Skeleton className="h-10 w-32" />
      </div>
      <div className="rounded-md border p-4 space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
