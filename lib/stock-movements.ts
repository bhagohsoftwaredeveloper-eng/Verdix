import { query } from './mysql';
import { StockMovement } from './types';
import { v4 as uuidv4 } from 'uuid';
import mysql from 'mysql2/promise';

/**
 * Records a stock movement in the database
 * @param movement The stock movement data to record
 * @param connection Optional connection for transaction support
 * @returns The recorded movement with generated ID and timestamps
 */
export async function recordStockMovement(
  movement: Omit<StockMovement, 'id' | 'createdAt' | 'updatedAt'>,
  connection?: mysql.PoolConnection | mysql.Pool
): Promise<StockMovement> {
  const id = uuidv4();

  const sql = `
    INSERT INTO stock_movements (
      id, product_id, product_name, movement_type, quantity_change,
      previous_stock, new_stock, reference_id, reference_type, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    id,
    movement.productId,
    movement.productName,
    movement.movementType,
    movement.quantityChange,
    movement.previousStock,
    movement.newStock,
    movement.referenceId || null,
    movement.referenceType || null,
    movement.notes || null,
  ];

  if (connection) {
    await connection.query(sql, params);
  } else {
    await query(sql, params);
  }

  return {
    ...movement,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Records stock movements for a sale transaction
 * @param saleId The sale ID
 * @param items Array of sale items with product info
 * @returns Array of recorded stock movements
 */
export async function recordSaleMovements(saleId: string, items: Array<{ product: { id: string; name: string; stock: number }; quantity: number }>): Promise<StockMovement[]> {
  const movements: StockMovement[] = [];

  for (const item of items) {
    const previousStock = item.product.stock;
    const quantityChange = -item.quantity; // Sales decrease stock
    const newStock = previousStock + quantityChange;

    const movement = await recordStockMovement({
      productId: item.product.id,
      productName: item.product.name,
      movementType: 'sale',
      quantityChange,
      previousStock,
      newStock,
      referenceId: saleId,
      referenceType: 'sale',
      notes: `Sale transaction`,
    });

    movements.push(movement);
  }

  return movements;
}

/**
 * Records stock movements for a purchase transaction
 * @param purchaseId The purchase ID
 * @param items Array of purchase items with product info
 * @returns Array of recorded stock movements
 */
export async function recordPurchaseMovements(purchaseId: string, items: Array<{ productId: string; productName: string; quantity: number }>): Promise<StockMovement[]> {
  const movements: StockMovement[] = [];

  for (const item of items) {
    // Get current stock for the product
    const currentStockResult = await query('SELECT stock FROM products WHERE id = ?', [item.productId]);
    const currentStock = currentStockResult[0]?.stock || 0;

    const previousStock = currentStock;
    const quantityChange = item.quantity; // Purchases increase stock
    const newStock = previousStock + quantityChange;

    const movement = await recordStockMovement({
      productId: item.productId,
      productName: item.productName,
      movementType: 'purchase',
      quantityChange,
      previousStock,
      newStock,
      referenceId: purchaseId,
      referenceType: 'purchase',
      notes: `Purchase transaction`,
    });

    movements.push(movement);
  }

  return movements;
}

/**
 * Records a stock adjustment movement
 * @param adjustmentId The adjustment ID
 * @param productId The product ID
 * @param productName The product name
 * @param quantityChange The quantity change
 * @param reason The adjustment reason
 * @returns The recorded stock movement
 */
export async function recordAdjustmentMovement(
  adjustmentId: string,
  productId: string,
  productName: string,
  quantityChange: number,
  reason: string
): Promise<StockMovement> {
  // Get current stock for the product
  const currentStockResult = await query('SELECT stock FROM products WHERE id = ?', [productId]);
  const currentStock = currentStockResult[0]?.stock || 0;

  const previousStock = currentStock - quantityChange; // Reverse to get previous stock
  const newStock = currentStock;

  return await recordStockMovement({
    productId,
    productName,
    movementType: 'adjustment',
    quantityChange,
    previousStock,
    newStock,
    referenceId: adjustmentId,
    referenceType: 'adjustment',
    notes: reason,
  });
}

/**
 * Gets stock movements for a specific product
 * @param productId The product ID
 * @param limit Optional limit for number of results
 * @returns Array of stock movements
 */
export async function getStockMovementsByProduct(productId: string, limit?: number): Promise<StockMovement[]> {
  let sql = `
    SELECT
      id, product_id as productId, product_name as productName,
      movement_type as movementType, quantity_change as quantityChange,
      previous_stock as previousStock, new_stock as newStock,
      reference_id as referenceId, reference_type as referenceType,
      notes, created_at as createdAt, updated_at as updatedAt
    FROM stock_movements
    WHERE product_id = ?
    ORDER BY created_at DESC
  `;

  const params: any[] = [productId];

  if (limit) {
    sql += ' LIMIT ?';
    params.push(limit);
  }

  const results = await query(sql, params);
  return results as StockMovement[];
}

/**
 * Gets all stock movements with optional filters
 * @param filters Optional filters for movement type, date range, etc.
 * @returns Array of stock movements
 */
export async function getStockMovements(filters?: {
  movementType?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<StockMovement[]> {
  let sql = `
    SELECT
      id, product_id as productId, product_name as productName,
      movement_type as movementType, quantity_change as quantityChange,
      previous_stock as previousStock, new_stock as newStock,
      reference_id as referenceId, reference_type as referenceType,
      notes, created_at as createdAt, updated_at as updatedAt
    FROM stock_movements
    WHERE 1=1
  `;

  const params: any[] = [];

  if (filters?.movementType) {
    sql += ' AND movement_type = ?';
    params.push(filters.movementType);
  }

  if (filters?.productId) {
    sql += ' AND product_id = ?';
    params.push(filters.productId);
  }

  if (filters?.dateFrom) {
    sql += ' AND created_at >= ?';
    params.push(filters.dateFrom);
  }

  if (filters?.dateTo) {
    sql += ' AND created_at <= ?';
    params.push(filters.dateTo);
  }

  sql += ' ORDER BY created_at DESC';

  if (filters?.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }

  const results = await query(sql, params);
  return results as StockMovement[];
}

/**
 * Updates product stock and records the movement
 * @param productId The product ID
 * @param quantityChange The quantity change (positive for increase, negative for decrease)
 * @param movementType The type of movement
 * @param referenceId Optional reference ID
 * @param referenceType Optional reference type
 * @param notes Optional notes
 * @returns The recorded stock movement
 */
export async function updateStockAndRecordMovement(
  productId: string,
  quantityChange: number,
  movementType: 'sale' | 'purchase' | 'adjustment' | 'return' | 'transfer',
  referenceId?: string,
  referenceType?: 'sale' | 'purchase' | 'adjustment' | 'return' | 'transfer',
  notes?: string,
  connection?: mysql.PoolConnection | mysql.Pool
): Promise<StockMovement> {
  // Get current product info
  const productSql = 'SELECT name, stock FROM products WHERE id = ?';
  const productResult = connection 
    ? (await connection.query(productSql, [productId]))[0] as any[]
    : await query(productSql, [productId]);
    
  if (!productResult || productResult.length === 0) {
    throw new Error(`Product with ID ${productId} not found`);
  }

  const product = productResult[0];
  const previousStock = product.stock;
  const newStock = previousStock + quantityChange;

  // Update product stock
  const updateSql = 'UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
  if (connection) {
    await connection.query(updateSql, [newStock, productId]);
  } else {
    await query(updateSql, [newStock, productId]);
  }

  // Record the movement
  return await recordStockMovement({
    productId,
    productName: product.name,
    movementType,
    quantityChange,
    previousStock,
    newStock,
    referenceId,
    referenceType,
    notes,
  }, connection);
}

/**
 * Records stock movements for a transfer between warehouses
 * @param transferId The transfer ID (reference)
 * @param sourceProductId The source product ID
 * @param targetProductId The target product ID
 * @param quantity The quantity transferred (positive)
 * @param notes Optional notes
 * @param connection Optional connection for transaction support
 */
export async function recordTransferMovements(
  transferId: string,
  sourceProductId: string,
  targetProductId: string,
  quantity: number,
  notes?: string,
  connection?: mysql.PoolConnection | mysql.Pool
): Promise<{ sourceMovement: StockMovement; targetMovement: StockMovement }> {
  // 1. Record OUT movement from source
  const sourceMovement = await updateStockAndRecordMovement(
    sourceProductId,
    -quantity,
    'transfer',
    transferId,
    'transfer',
    `Transfer to product ${targetProductId}${notes ? ': ' + notes : ''}`,
    connection
  );

  // 2. Record IN movement to target
  const targetMovement = await updateStockAndRecordMovement(
    targetProductId,
    quantity,
    'transfer',
    transferId,
    'transfer',
    `Transfer from product ${sourceProductId}${notes ? ': ' + notes : ''}`,
    connection
  );

  return { sourceMovement, targetMovement };
}
