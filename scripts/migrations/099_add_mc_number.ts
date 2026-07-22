import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

/**
 * Add a real, persisted Merchandise Credit (MC) number.
 *
 * Before this, the credit slip # was generated in the browser at PRINT time as
 * `MC-<order>-<yyMMddHHmm>` and never saved. The Merchandise Credit report had
 * nothing to show, so its "MC No." column fell back to the return's SI number.
 *
 * This migration:
 *   1. Adds transaction_references.mc_number — the counter, mirroring si_number.
 *      Starts at '000000' because getNextMCNumber() increments-then-reads, so
 *      the FIRST credit slip issued is MC-000001.
 *   2. Adds pos_transactions.mc_number — where the issued number is stored.
 *
 * Existing returns are deliberately NOT backfilled. The slips already in
 * customers' hands carry the old `MC-<order>-<yyMMddHHmm>` format; assigning
 * them fresh sequential numbers would make the report contradict the paper.
 * Old returns stay identifiable by Orig SI No., which does match the slip.
 */
const migration: Migration = {
  name: '099_add_mc_number',
  timestamp: '2026-07-22_10-00-00',

  async up(): Promise<void> {
    // 1. The counter. Nullable-safe default matches the si_number convention.
    const [refCol]: any = await query(`
      SELECT COUNT(*) AS cnt
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'transaction_references'
        AND COLUMN_NAME = 'mc_number'
    `);
    if (refCol?.cnt > 0) {
      console.log('• transaction_references.mc_number already exists — skipping');
    } else {
      await query(`
        ALTER TABLE transaction_references
        ADD COLUMN mc_number VARCHAR(20) NOT NULL DEFAULT '000000'
      `);
      console.log('✅ Added transaction_references.mc_number (counter, starts 000000)');
    }

    // Ensure the singleton counter row actually has a value.
    await query(`
      UPDATE transaction_references
      SET mc_number = '000000'
      WHERE id = 1 AND (mc_number IS NULL OR mc_number = '')
    `);

    // 2. Where each issued MC number is stored. NULL = pre-existing return that
    //    never had a persisted number (report renders these as '—').
    const [txCol]: any = await query(`
      SELECT COUNT(*) AS cnt
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'pos_transactions'
        AND COLUMN_NAME = 'mc_number'
    `);
    if (txCol?.cnt > 0) {
      console.log('• pos_transactions.mc_number already exists — skipping');
      return;
    }

    await query(`
      ALTER TABLE pos_transactions
      ADD COLUMN mc_number VARCHAR(20) NULL
    `);
    console.log('✅ Added pos_transactions.mc_number');

    // Unique so a duplicate MC number can never be issued. NULLs are exempt from
    // UNIQUE in MySQL, so the un-backfilled historical returns coexist fine.
    await query(`
      CREATE UNIQUE INDEX idx_pos_transactions_mc_number
      ON pos_transactions (mc_number)
    `);
    console.log('✅ Added unique index on pos_transactions.mc_number');
  },

  async down(): Promise<void> {
    await query(`DROP INDEX idx_pos_transactions_mc_number ON pos_transactions`);
    await query(`ALTER TABLE pos_transactions DROP COLUMN mc_number`);
    console.log('✅ Dropped pos_transactions.mc_number');

    // The counter itself is NOT rolled back to a lower value elsewhere; dropping
    // the column is enough. Re-running up() restarts at 000000 only on a DB that
    // never had it — matching the si_number rollback stance (no renumbering).
    await query(`ALTER TABLE transaction_references DROP COLUMN mc_number`);
    console.log('✅ Dropped transaction_references.mc_number');
  }
};

registerMigration(migration);
