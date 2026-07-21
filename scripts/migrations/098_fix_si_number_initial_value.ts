import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

/**
 * Fix the SI-number counter so the FIRST issued invoice is 000001, not 000002.
 *
 * getNextSINumber() increments-then-reads, so transaction_references.si_number
 * holds the LAST-USED number and must start at 0. Migration 084 seeded the
 * column DEFAULT '000001', which made the first sale compute 000001 + 1 = 000002.
 *
 * This migration:
 *   1. Corrects the column default to '000000' for future installs.
 *   2. Resets the counter to '000000' ONLY when it is still at the untouched
 *      seed '000001' AND no invoice has been issued yet — so a live store that
 *      has already sequenced invoices is never renumbered (BIR: no gaps/dupes).
 */
const migration: Migration = {
  name: '098_fix_si_number_initial_value',
  timestamp: '2026-07-21_09-00-00',

  async up(): Promise<void> {
    // 1. Correct the default for fresh installs.
    await query(`
      ALTER TABLE transaction_references
      ALTER COLUMN si_number SET DEFAULT '000000'
    `);
    console.log('✅ transaction_references.si_number default set to 000000');

    // 2. Only reset an untouched counter — never a store that already issued SIs.
    const issued: any = await query(`
      SELECT COUNT(*) as cnt
      FROM sales_transactions
      WHERE si_number IS NOT NULL AND si_number <> ''
    `);
    const alreadyIssued = issued[0]?.cnt > 0;

    if (alreadyIssued) {
      console.log('⏭️  Invoices already issued — leaving SI counter untouched');
      return;
    }

    const result: any = await query(`
      UPDATE transaction_references
      SET si_number = '000000'
      WHERE id = 1
        AND (si_number IS NULL OR si_number = '' OR si_number = '000001')
    `);
    if (result?.affectedRows > 0) {
      console.log('✅ Reset untouched SI counter to 000000 — first invoice will be 000001');
    } else {
      console.log('• SI counter not at untouched seed — no reset performed');
    }
  },

  async down(): Promise<void> {
    // Restore the previous default. The counter value is not rolled back —
    // reverting an already-advanced sequence would risk duplicate SI numbers.
    await query(`
      ALTER TABLE transaction_references
      ALTER COLUMN si_number SET DEFAULT '000001'
    `);
    console.log('✅ transaction_references.si_number default restored to 000001');
  }
};

registerMigration(migration);
