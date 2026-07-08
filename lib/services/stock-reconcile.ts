/**
 * Delta-based stock reconciliation.
 *
 * Foreign stock_movements (created on another writer and pulled down) carry a
 * portable `quantity_change` delta. This applies each not-yet-applied movement's
 * delta to the local products.stock exactly once (guarded by stock_movement_applied)
 * and marks it applied. Commutative (addition) so order does not matter; negative
 * stock is allowed (offline multi-master cannot globally lock) and surfaced.
 *
 * Locally-created movements are pre-marked applied by recordStockMovement, so they
 * are skipped here.
 */
import { query, withTransaction } from '../mysql';

export async function reconcileStockDeltas(
  batchSize = 500,
): Promise<{ applied: number; negatives: number }> {
  let applied = 0;

  for (;;) {
    const rows = (await query(
      `SELECT sm.id AS id, sm.product_id AS productId, sm.quantity_change AS quantityChange
         FROM stock_movements sm
         LEFT JOIN stock_movement_applied a ON a.movement_id = sm.id
        WHERE a.movement_id IS NULL
        ORDER BY sm.created_at ASC, sm.id ASC
        LIMIT ${batchSize}`,
    )) as any[];
    if (!rows.length) break;

    // Apply + mark in one transaction per batch: an interruption never leaves a
    // delta applied-but-unmarked (which would double-apply) or marked-but-unapplied.
    await withTransaction(async (conn) => {
      for (const r of rows) {
        // Claim the movement first: INSERT IGNORE on the PK is the atomic gate. If a
        // concurrent (or prior) run already claimed/applied it, affectedRows is 0 and
        // we skip — this prevents a double-apply when two reconcile runs overlap.
        const [claim]: any = await conn.query(
          `INSERT IGNORE INTO stock_movement_applied (movement_id) VALUES (?)`,
          [r.id],
        );
        if (!claim || claim.affectedRows !== 1) continue; // already applied/claimed

        const [upd]: any = await conn.query(
          `UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [Number(r.quantityChange || 0), r.productId],
        );

        if (!upd || upd.affectedRows === 0) {
          // Product not present locally yet — release the claim so this delta is
          // retried on a later cycle once the product row arrives (never lost).
          await conn.query(`DELETE FROM stock_movement_applied WHERE movement_id = ?`, [r.id]);
          continue;
        }
        applied++;
      }
    });

    if (rows.length < batchSize) break;
  }

  let negatives = 0;
  if (applied > 0) {
    const neg = (await query(`SELECT COUNT(*) AS n FROM products WHERE stock < 0`)) as any[];
    negatives = Number(neg[0]?.n || 0);
    if (negatives > 0) {
      console.warn(
        `[StockReconcile] ${negatives} product(s) have negative stock after reconcile — review oversell.`,
      );
    }
  }

  if (applied > 0) {
    console.log(`[StockReconcile] Applied ${applied} movement delta(s).`);
  }
  return { applied, negatives };
}
