import { StockCountRepository } from '../domain/IStockCountRepository';
import { PoolConnection } from 'mysql2/promise';
import { findUltimateRoot, addFamilyStock, deductFamilyStock } from '../../../../lib/family-sync';

export class CompleteStockCountUseCase {
  constructor(private stockCountRepository: StockCountRepository) {}

  async execute(stockCountId: string): Promise<void> {
    const stockCount = await this.stockCountRepository.findById(stockCountId);
    if (!stockCount) throw new Error('Stock count not found');
    if (stockCount.status === 'completed') throw new Error('Stock count is already completed');

    await this.stockCountRepository.saveWithTransaction(stockCountId, async (connection: PoolConnection) => {
      // 1. Update each product's stock and record movement
      for (const item of stockCount.items) {
        // Skip uncounted items
        if (item.countedQuantity === undefined || item.countedQuantity === null) continue;

        if (item.snapshotQuantity !== item.countedQuantity) {
          const quantityChange = item.countedQuantity - item.snapshotQuantity;
          
          // Use family-sync logic to propagate the count adjustment
          const { rootId, factorToRoot } = await findUltimateRoot(item.productId, connection);
          const quantityInRootUnits = Math.abs(quantityChange) / factorToRoot;

          if (quantityChange > 0) {
            await addFamilyStock(
              rootId,
              quantityInRootUnits,
              stockCountId,
              'adjustment',
              item.adjustmentReason || 'System Adjustment from Stock Count',
              connection
            );
          } else {
            await deductFamilyStock(
              rootId,
              quantityInRootUnits,
              stockCountId,
              'adjustment',
              item.adjustmentReason || 'System Adjustment from Stock Count',
              connection
            );
          }
        }
      }

      // 2. Mark stock count as completed
      await connection.query('UPDATE stock_counts SET status = "completed", completed_at = NOW(), updated_at = NOW() WHERE id = ?', [stockCountId]);
    });
  }
}
