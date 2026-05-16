import { query, withTransaction } from '../../../lib/mysql';
import { InventoryTransferRepository } from '../../core/inventory/domain/IInventoryTransferRepository';
import { InventoryTransferEntity, InventoryTransferItemEntity } from '../../core/inventory/domain/InventoryTransfer';
import { PoolConnection } from 'mysql2/promise';

export class MySqlInventoryTransferRepository implements InventoryTransferRepository {
  async findAll(): Promise<InventoryTransferEntity[]> {
    const transfersQuery = `
      SELECT 
        id, source_warehouse_id as sourceWarehouseId, target_warehouse_id as targetWarehouseId, 
        transfer_date as transferDate, reference, status, notes, created_at as createdAt, updated_at as updatedAt
      FROM inventory_transfers
      ORDER BY created_at DESC
    `;
    const transfersRaw: any[] = await query(transfersQuery);
    
    if (transfersRaw.length === 0) return [];

    const transferIds = transfersRaw.map(t => t.id);
    const placeholders = transferIds.map(() => '?').join(',');
    
    const itemsQuery = `
      SELECT 
        id, transfer_id as transferId, product_id as productId, product_name as productName, 
        quantity, unit_of_measure as unitOfMeasure, created_at as createdAt
      FROM inventory_transfer_items
      WHERE transfer_id IN (${placeholders})
    `;
    const itemsRaw: any[] = await query(itemsQuery, transferIds);

    const itemsByTransfer: Record<string, InventoryTransferItemEntity[]> = {};
    itemsRaw.forEach(item => {
      if (!itemsByTransfer[item.transferId]) {
        itemsByTransfer[item.transferId] = [];
      }
      itemsByTransfer[item.transferId].push({
        ...item,
        quantity: parseFloat(item.quantity)
      });
    });

    return transfersRaw.map(t => ({
      ...t,
      items: itemsByTransfer[t.id] || []
    }));
  }

  async findById(id: string): Promise<InventoryTransferEntity | null> {
    const all = await this.findAll();
    return all.find(t => t.id === id) || null;
  }

  async create(transfer: InventoryTransferEntity): Promise<string> {
    throw new Error('Use saveWithTransaction for complete transfer creation');
  }

  async saveWithTransaction(transfer: InventoryTransferEntity, operations: (connection: PoolConnection) => Promise<void>): Promise<string> {
    return await withTransaction(async (connection) => {
      const insertTransferSql = `
        INSERT INTO inventory_transfers (
          id, source_warehouse_id, target_warehouse_id, transfer_date, reference, status, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      await connection.query(insertTransferSql, [
        transfer.id, transfer.sourceWarehouseId, transfer.targetWarehouseId, 
        transfer.transferDate, transfer.reference || null, transfer.status, transfer.notes || null
      ]);

      const insertItemSql = `
        INSERT INTO inventory_transfer_items (
          id, transfer_id, product_id, product_name, quantity, unit_of_measure, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      `;

      for (const item of transfer.items) {
        await connection.query(insertItemSql, [
          item.id, transfer.id, item.productId, item.productName, item.quantity, item.unitOfMeasure || null
        ]);
      }

      await operations(connection);

      return transfer.id;
    });
  }
}
