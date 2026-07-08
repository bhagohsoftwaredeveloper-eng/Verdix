import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '085_backfill_si_numbers',
  timestamp: '2026-06-23_10-10-00',

  async up(): Promise<void> {
    // Find max existing order_number
    const maxOrderResult: any = await query(
      'SELECT MAX(CAST(COALESCE(order_number, 0) AS UNSIGNED)) as max_order FROM pos_transactions'
    );
    const maxOrder = maxOrderResult[0]?.max_order || 0;

    // Find max existing receipt_number
    const maxReceiptResult: any = await query(
      'SELECT MAX(CAST(COALESCE(receipt_number, 0) AS UNSIGNED)) as max_receipt FROM sales_transactions'
    );
    const maxReceipt = maxReceiptResult[0]?.max_receipt || 0;

    const startingNum = Math.max(maxOrder, maxReceipt) + 1;

    // Backfill pos_transactions using order_number
    const backfillPos = `
      UPDATE pos_transactions
      SET si_number = LPAD(order_number, 6, '0')
      WHERE si_number IS NULL AND order_number IS NOT NULL AND order_number > 0
    `;
    await query(backfillPos);
    console.log('✅ Backfilled si_number in pos_transactions from order_number');

    // Backfill sales_transactions using si_number from linked pos_transaction
    const backfillSales = `
      UPDATE sales_transactions st
      SET si_number = (
        SELECT LPAD(pt.order_number, 6, '0')
        FROM pos_transactions pt
        WHERE pt.sale_id = st.id
        LIMIT 1
      )
      WHERE st.si_number IS NULL
        AND EXISTS (
          SELECT 1 FROM pos_transactions pt
          WHERE pt.sale_id = st.id AND pt.order_number IS NOT NULL
        )
    `;
    await query(backfillSales);
    console.log('✅ Backfilled si_number in sales_transactions from pos_transactions');

    // For any remaining records without si_number, use receipt_number as fallback
    const backfillRemaining = `
      UPDATE sales_transactions
      SET si_number = LPAD(COALESCE(receipt_number, '0'), 6, '0')
      WHERE si_number IS NULL AND receipt_number IS NOT NULL
    `;
    await query(backfillRemaining);
    console.log('✅ Backfilled remaining si_number values from receipt_number');

    // Update transaction_references to start from the next number
    const updateReference = `
      UPDATE transaction_references
      SET si_number = LPAD(?, 6, '0')
      WHERE id = 1
    `;
    await query(updateReference, [startingNum]);
    console.log(`✅ Updated transaction_references.si_number to start from ${String(startingNum).padStart(6, '0')}`);
  },

  async down(): Promise<void> {
    // Clear all si_number values (don't delete the column, as down should be reversible)
    await query('UPDATE sales_transactions SET si_number = NULL');
    await query('UPDATE pos_transactions SET si_number = NULL');
    await query("UPDATE transaction_references SET si_number = '000001' WHERE id = 1");
    console.log('✅ Cleared si_number values from all tables');
  }
};

registerMigration(migration);
