'use server';

import { db } from '@/lib/db';

export type RepackagingLog = {
  id: string;
  sourceProductId: string;
  sourceProductName: string;
  sourceSku?: string;
  sourceQty: number;
  targetProductId: string;
  targetProductName: string;
  targetSku?: string;
  targetQtyProduced: number;
  factor: number;
  status: string;
  approvalQueueId: string | null;
  notes: string | null;
  direction: 'break' | 'consolidate';
  createdBy: string | null;
  createdAt: Date;
};

export async function getRepackagingHistory(limit: number = 50, offset: number = 0): Promise<RepackagingLog[]> {
  try {
    const rows = await db.repackagingLog.findMany({
      include: {
        sourceProduct: { select: { sku: true } },
        targetProduct: { select: { sku: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return (rows || []).map((r) => ({
      id: r.id,
      sourceProductId: r.sourceProductId,
      sourceProductName: r.sourceProductName,
      sourceSku: r.sourceProduct?.sku || undefined,
      sourceQty: Number(r.sourceQty),
      targetProductId: r.targetProductId,
      targetProductName: r.targetProductName,
      targetSku: r.targetProduct?.sku || undefined,
      targetQtyProduced: Number(r.targetQtyProduced),
      factor: Number(r.factor),
      status: r.status,
      approvalQueueId: r.approvalQueueId,
      notes: r.notes,
      direction: r.notes === 'consolidate' ? 'consolidate' : 'break',
      createdBy: r.createdBy,
      createdAt: r.createdAt,
    }));
  } catch (error) {
    console.error('Error fetching repackaging history:', error);
    return [];
  }
}

export async function getRepackagingHistoryCount(): Promise<number> {
  try {
    return await db.repackagingLog.count();
  } catch (error) {
    console.error('Error fetching repackaging history count:', error);
    return 0;
  }
}
