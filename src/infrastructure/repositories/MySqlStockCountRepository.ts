import { query, withTransaction } from '../../../lib/mysql';
import { StockCountRepository } from '../../core/inventory/domain/IStockCountRepository';
import { StockCountEntity, StockCountItemEntity } from '../../core/inventory/domain/StockCount';
import { PoolConnection } from 'mysql2/promise';

export class MySqlStockCountRepository implements StockCountRepository {
  async findAll(): Promise<StockCountEntity[]> {
    const countsQuery = `
      SELECT id, warehouse_id as warehouseId, count_date as countDate, status, notes, created_at as createdAt, updated_at as updatedAt
      FROM stock_counts
      ORDER BY count_date DESC
    `;
    const countsRaw: any[] = await query(countsQuery);
    
    if (countsRaw.length === 0) return [];

    const countIds = countsRaw.map(c => c.id);
    const placeholders = countIds.map(() => '?').join(',');
    
    const itemsQuery = `
      SELECT id, stock_count_id as stockCountId, product_id as productId, product_name as productName, 
             expected_quantity as expectedQuantity, counted_quantity as countedQuantity, 
             adjustment_reason as adjustmentReason, created_at as createdAt
      FROM stock_count_items
      WHERE stock_count_id IN (${placeholders})
    `;
    const itemsRaw: any[] = await query(itemsQuery, countIds);

    const itemsByCount: Record<string, StockCountItemEntity[]> = {};
    itemsRaw.forEach(item => {
      if (!itemsByCount[item.stockCountId]) {
        itemsByCount[item.stockCountId] = [];
      }
      itemsByCount[item.stockCountId].push({
        ...item,
        expectedQuantity: parseFloat(item.expectedQuantity),
        countedQuantity: parseFloat(item.countedQuantity)
      });
    });

    return countsRaw.map(c => ({
      ...c,
      items: itemsByCount[c.id] || []
    }));
  }

  async findById(id: string): Promise<StockCountEntity | null> {
    const all = await this.findAll();
    return all.find(c => c.id === id) || null;
  }

  async create(stockCount: StockCountEntity): Promise<string> {
     return await withTransaction(async (connection) => {
        const sql = `
            INSERT INTO stock_counts (id, warehouse_id, count_date, status, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        `;
        await connection.query(sql, [
            stockCount.id, stockCount.warehouseId, stockCount.countDate, stockCount.status, stockCount.notes || null
        ]);

        const itemSql = `
            INSERT INTO stock_count_items (id, stock_count_id, product_id, product_name, expected_quantity, counted_quantity, adjustment_reason, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        for (const item of stockCount.items) {
            await connection.query(itemSql, [
                item.id, stockCount.id, item.productId, item.productName, item.expectedQuantity, item.countedQuantity, item.adjustmentReason || null
            ]);
        }
        return stockCount.id;
     });
  }

  async update(id: string, stockCount: Partial<StockCountEntity>): Promise<void> {
    const updates: string[] = [];
    const params: any[] = [];
    
    if (stockCount.status) {
      updates.push('status = ?');
      params.push(stockCount.status);
    }
    if (stockCount.notes !== undefined) {
      updates.push('notes = ?');
      params.push(stockCount.notes);
    }

    if (updates.length > 0) {
      const sql = `UPDATE stock_counts SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`;
      params.push(id);
      await query(sql, params);
    }
  }

  async saveWithTransaction(stockCountId: string, operations: (connection: PoolConnection) => Promise<void>): Promise<void> {
    await withTransaction(async (connection) => {
      await operations(connection);
    });
  }
}
