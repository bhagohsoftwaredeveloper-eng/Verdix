import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '093_backfill_stock_movement_applied',
  timestamp: '2026-07-06_13-30-00',

  async up(): Promise<void> {
    // Every stock_movements row that existed BEFORE delta-based reconciliation was
    // introduced is already reflected in this node's products.stock. Mark them all
    // as applied so reconcileStockDeltas() never re-applies (double-counts) the
    // historical deltas. INSERT IGNORE keeps this idempotent and safe to re-run.
    const res: any = await query(
      `INSERT IGNORE INTO stock_movement_applied (movement_id)
       SELECT id FROM stock_movements`
    );
    const n = res?.affectedRows ?? '?';
    console.log(`✅ Backfilled stock_movement_applied (${n} existing movement(s) marked applied)`);
  },

  async down(): Promise<void> {
    // No-op: the marks are indistinguishable from ordinary applied marks and are
    // harmless to keep. Dropping them would risk re-applying historical deltas.
    console.log('• 093 down is a no-op (backfill marks are harmless to keep)');
  }
};

registerMigration(migration);
