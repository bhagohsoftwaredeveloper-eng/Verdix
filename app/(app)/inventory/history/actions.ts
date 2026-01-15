'use server';

import { query } from '@/lib/mysql';
import { recordAdjustmentMovement } from '@/lib/stock-movements';
import type { StockAdjustment } from '@/lib/types';

export async function getStockAdjustments(limit?: number, offset?: number) {
  try {
    let sql = `
      SELECT
        sa.*,
        p.name as product_name,
        p.sku as product_sku,
        p.category,
        p.brand
      FROM stock_adjustments sa
      LEFT JOIN products p ON sa.product_id = p.id
      ORDER BY sa.created_at DESC
    `;

    const params: any[] = [];

    if (limit !== undefined && offset !== undefined) {
      sql += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const adjustments = await query(sql, params.length > 0 ? params : undefined);

    // Map database fields to StockAdjustment type
    return adjustments.map((adj: any) => ({
      id: adj.id,
      productId: adj.product_id,
      productName: adj.product_name,
      quantity: parseInt(adj.quantity),
      reason: adj.reason,
      date: adj.created_at,
      newStock: parseInt(adj.new_stock),
      // Include product info for better display
      product: adj.product_name ? {
        id: adj.product_id,
        name: adj.product_name,
        sku: adj.product_sku,
        category: adj.category,
        brand: adj.brand
      } : undefined
    })) as StockAdjustment[];
  } catch (error) {
    console.error('Error fetching stock adjustments:', error);
    return [];
  }
}

export async function getStockAdjustmentsCount() {
  try {
    const sql = `SELECT COUNT(*) as count FROM stock_adjustments`;
    const result = await query(sql);
    return result[0].count;
  } catch (error) {
    console.error('Error fetching stock adjustments count:', error);
    return 0;
  }
}

export async function createStockAdjustment(productId: string, quantity: number, reason: string, newStock: number) {
  try {
    const adjustmentId = `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const sql = `
      INSERT INTO stock_adjustments (id, product_id, quantity, reason, new_stock)
      VALUES (?, ?, ?, ?, ?)
    `;

    await query(sql, [adjustmentId, productId, quantity, reason, newStock]);

    // Get product name for recording movement
    const getProductSql = `SELECT name FROM products WHERE id = ?`;
    const productResult = await query(getProductSql, [productId]);
    const productName = productResult[0]?.name || 'Unknown Product';

    // Record the adjustment in stock movements
    await recordAdjustmentMovement(adjustmentId, productId, productName, quantity, reason);

    return { success: true, adjustmentId };
  } catch (error) {
    console.error('Error creating stock adjustment:', error);
    return { success: false, error: 'Failed to create stock adjustment' };
  }
}

export async function getStockAdjustmentsByProduct(productId: string, limit?: number) {
  try {
    let sql = `
      SELECT
        sa.*,
        p.name as product_name,
        p.sku as product_sku
      FROM stock_adjustments sa
      LEFT JOIN products p ON sa.product_id = p.id
      WHERE sa.product_id = ?
      ORDER BY sa.created_at DESC
    `;

    const params: any[] = [productId];

    if (limit !== undefined) {
      sql += ` LIMIT ?`;
      params.push(limit);
    }

    const adjustments = await query(sql, params);

    return adjustments.map((adj: any) => ({
      id: adj.id,
      productId: adj.product_id,
      productName: adj.product_name,
      quantity: parseInt(adj.quantity),
      reason: adj.reason,
      date: adj.created_at,
      newStock: parseInt(adj.new_stock),
      product: adj.product_name ? {
        id: adj.product_id,
        name: adj.product_name,
        sku: adj.product_sku
      } : undefined
    })) as StockAdjustment[];
  } catch (error) {
    console.error('Error fetching stock adjustments by product:', error);
    return [];
  }
}

export async function migrateAdjustmentsToMovements() {
  try {
    // Get all stock adjustments that don't have corresponding movements
    const sql = `
      SELECT sa.*, p.name as product_name
      FROM stock_adjustments sa
      LEFT JOIN products p ON sa.product_id = p.id
      LEFT JOIN stock_movements sm ON sa.id = sm.reference_id AND sm.reference_type = 'adjustment'
      WHERE sm.id IS NULL
    `;

    const adjustments = await query(sql);

    let migratedCount = 0;

    for (const adj of adjustments) {
      try {
        // Calculate previous stock: new_stock - quantity
        const previousStock = adj.new_stock - adj.quantity;

        await recordAdjustmentMovement(
          adj.id,
          adj.product_id,
          adj.product_name || 'Unknown Product',
          adj.quantity,
          adj.reason
        );

        migratedCount++;
      } catch (error) {
        console.error(`Failed to migrate adjustment ${adj.id}:`, error);
      }
    }

    return { success: true, migratedCount };
  } catch (error) {
    console.error('Error migrating adjustments to movements:', error);
    return { success: false, error: 'Failed to migrate adjustments' };
  }
}

export async function adjustStock(productId: string, quantity: number, reason: string) {
  try {
    // First, get current stock, name, conversion factor, and check if this product has children
    const getProductSql = `SELECT stock, name, parent_id, conversion_factor FROM products WHERE id = ?`;
    const productResult = await query(getProductSql, [productId]);

    if (productResult.length === 0) {
      return { success: false, error: 'Product not found' };
    }

    const currentStock = parseInt(productResult[0].stock);
    const productName = productResult[0].name;
    const newStock = currentStock + quantity;

    // Validate new stock is not negative
    if (newStock < 0) {
      return { success: false, error: 'Stock cannot go below zero' };
    }

    // Update product stock
    const updateStockSql = `UPDATE products SET stock = ? WHERE id = ?`;
    await query(updateStockSql, [newStock, productId]);

    // Create stock adjustment record for the main product
    const adjustmentId = `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createAdjustmentSql = `
      INSERT INTO stock_adjustments (id, product_id, quantity, reason, new_stock)
      VALUES (?, ?, ?, ?, ?)
    `;
    await query(createAdjustmentSql, [adjustmentId, productId, quantity, reason, newStock]);

    // Record the adjustment in stock movements
    await recordAdjustmentMovement(adjustmentId, productId, productName, quantity, reason);

    // Check if this product has children and adjust them automatically based on conversion factors
    const getChildrenSql = `SELECT id, stock, unit_of_measure FROM products WHERE parent_id = ?`;
    const children = await query(getChildrenSql, [productId]);

    if (children.length > 0) {
      // Get the parent's conversion factors
      const getParentCFSql = `SELECT unit, factor FROM conversion_factors WHERE product_id = ?`;
      const parentCFs = await query(getParentCFSql, [productId]);

      // Apply conversion-factor-based adjustment to all children
      // Each child gets synchronized to: parent_new_stock * child's_conversion_factor
      for (const child of children) {
        const newParentStock = currentStock + quantity;

        // Find the conversion factor for this child's unit
        const childCF = parentCFs.find((cf: any) => cf.unit === child.unit_of_measure);
        const conversionFactor = childCF ? parseFloat(childCF.factor) : 1;

        const childTargetStock = Math.floor(newParentStock * conversionFactor);
        const childCurrentStock = parseInt(child.stock);
        const childAdjustment = childTargetStock - childCurrentStock;

        // Update child stock to the target amount
        const updateChildStockSql = `UPDATE products SET stock = ? WHERE id = ?`;
        await query(updateChildStockSql, [childTargetStock, child.id]);

        // Get child product name
        const getChildNameSql = `SELECT name FROM products WHERE id = ?`;
        const childResult = await query(getChildNameSql, [child.id]);
        const childName = childResult[0]?.name || 'Unknown Product';

        // Create stock adjustment record for the child
        const childAdjustmentId = `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const childReason = `${reason} (Auto-adjusted from parent: ${newParentStock} × ${conversionFactor} = ${childTargetStock})`;
        const createChildAdjustmentSql = `
          INSERT INTO stock_adjustments (id, product_id, quantity, reason, new_stock)
          VALUES (?, ?, ?, ?, ?)
        `;
        await query(createChildAdjustmentSql, [childAdjustmentId, child.id, childAdjustment, childReason, childTargetStock]);

        // Record the child adjustment in stock movements
        await recordAdjustmentMovement(childAdjustmentId, child.id, childName, childAdjustment, childReason);
      }
    }

    return { success: true, adjustmentId, newStock };
  } catch (error) {
    console.error('Error adjusting stock:', error);
    return { success: false, error: 'Failed to adjust stock' };
  }
}
