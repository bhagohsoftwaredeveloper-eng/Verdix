'use server';

import { query } from '@/lib/mysql';

export type RepackagingLog = {
  id: string;
  sourceProductId: string;
  sourceProductName: string;
  sourceQty: number;
  targetProductId: string;
  targetProductName: string;
  targetQtyProduced: number;
  factor: number;
  status: string;
  approvalQueueId: string | null;
  notes: string | null;
  direction: 'break' | 'consolidate';
  createdBy: string | null;
  createdAt: string;
};

export async function getRepackagingHistory(limit: number = 50, offset: number = 0): Promise<RepackagingLog[]> {
  try {
    const rows: any = await query(
      `SELECT
        rl.*,
        sp.sku AS source_sku,
        tp.sku AS target_sku
       FROM repackaging_logs rl
       LEFT JOIN products sp ON rl.source_product_id = sp.id
       LEFT JOIN products tp ON rl.target_product_id = tp.id
       ORDER BY rl.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return (rows || []).map((r: any) => ({
      id: r.id,
      sourceProductId: r.source_product_id,
      sourceProductName: r.source_product_name,
      sourceSku: r.source_sku,
      sourceQty: parseFloat(r.source_qty),
      targetProductId: r.target_product_id,
      targetProductName: r.target_product_name,
      targetSku: r.target_sku,
      targetQtyProduced: parseFloat(r.target_qty_produced),
      factor: parseFloat(r.factor),
      status: r.status,
      approvalQueueId: r.approval_queue_id,
      notes: r.notes,
      direction: r.notes === 'consolidate' ? 'consolidate' : 'break',
      createdBy: r.created_by,
      createdAt: r.created_at,
    }));
  } catch (error) {
    console.error('Error fetching repackaging history:', error);
    return [];
  }
}

export async function getRepackagingHistoryCount(): Promise<number> {
  try {
    const result: any = await query('SELECT COUNT(*) as count FROM repackaging_logs');
    return result[0]?.count || 0;
  } catch (error) {
    return 0;
  }
}
