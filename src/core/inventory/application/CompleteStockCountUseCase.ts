import { StockCountRepository } from '../domain/IStockCountRepository';
import { PoolConnection } from 'mysql2/promise';

export class CompleteStockCountUseCase {
  constructor(private stockCountRepository: StockCountRepository) {}

  async execute(stockCountId: string): Promise<void> {
    const stockCount = await this.stockCountRepository.findById(stockCountId);
    if (!stockCount) throw new Error('Stock count not found');
    if (stockCount.status === 'Completed') throw new Error('Stock count is already completed');

    await this.stockCountRepository.saveWithTransaction(stockCountId, async (connection: PoolConnection) => {
      // 1. Update each product's stock and record movement
      for (const item of stockCount.items) {
        if (item.expectedQuantity !== item.countedQuantity) {
          const quantityChange = item.countedQuantity - item.expectedQuantity;
          
          // Fetch current stock to be most accurate
          const [status]: any = await connection.query('SELECT stock FROM products WHERE id = ?', [item.productId]);
          const previousStock = status[0]?.stock || 0;
          const newStock = item.countedQuantity; // The counted quantity is the NEW physical truth

          await connection.query('UPDATE products SET stock = ? WHERE id = ?', [newStock, item.productId]);

          const movementId = `mov_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          await connection.query(
            `INSERT INTO stock_movements (
              id, product_id, product_name, movement_type, quantity_change, previous_stock, new_stock, 
              reference_id, reference_type, notes, warehouse_id, created_at, updated_at
            ) VALUES (?, ?, ?, 'adjustment', ?, ?, ?, ?, 'stock_count', ?, ?, NOW(), NOW())`,
            [
                movementId, item.productId, item.productName, quantityChange, previousStock, newStock, 
                stockCountId, item.adjustmentReason || 'System Adjustment from Stock Count', stockCount.warehouseId
            ]
          );
        }
      }

      // 2. Mark stock count as completed
      await connection.query('UPDATE stock_counts SET status = "Completed", updated_at = NOW() WHERE id = ?', [stockCountId]);
    });
  }
}
