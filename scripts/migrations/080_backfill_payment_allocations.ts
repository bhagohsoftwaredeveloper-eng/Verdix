import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

/**
 * Backfill allocation links for payments recorded BEFORE the payment_allocations
 * table existed. Those payments only stored the linked invoice inside their `note`
 * (e.g. "Payment for Invoice #<id>."). After SOA switched to reading the junction
 * table, such payments would otherwise show as "Unallocated".
 *
 * This migration, for every payment that has no allocation row yet:
 *   1. Parses the invoice token out of the note (id OR human-readable reference).
 *   2. Finds the matching invoice (preferring the same customer).
 *   3. Inserts a payment_allocations row (amount = full payment amount).
 *   4. Rewrites the note to use the human-readable invoice reference, if it used
 *      the internal id.
 *
 * CHARGE-type rows are skipped (they are debits, not payments against an invoice).
 */
const migration: Migration = {
  name: '080_backfill_payment_allocations',
  timestamp: '2026-06-02_00-10-00',

  async up(): Promise<void> {
    // Safety: make sure the junction table exists before we read/write it.
    await query(`
      CREATE TABLE IF NOT EXISTS payment_allocations (
        id VARCHAR(255) PRIMARY KEY,
        payment_id VARCHAR(255) NOT NULL,
        invoice_id VARCHAR(255) NOT NULL,
        amount_allocated DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_payment_id (payment_id),
        INDEX idx_invoice_id (invoice_id),
        CONSTRAINT fk_pa_payment FOREIGN KEY (payment_id) REFERENCES customer_payments(id) ON DELETE CASCADE
      )
    `);

    const payments: any[] = await query(`
      SELECT cp.id, cp.customer_id, cp.payment_type, cp.amount, cp.note
      FROM customer_payments cp
      WHERE cp.note IS NOT NULL
        AND cp.note LIKE '%Invoice #%'
        AND UPPER(cp.payment_type) != 'CHARGE'
        AND NOT EXISTS (SELECT 1 FROM payment_allocations pa WHERE pa.payment_id = cp.id)
    `);

    let linked = 0;
    let noteFixed = 0;
    let unmatched = 0;

    for (const p of payments) {
      // Extract the invoice token after "#", up to the first dot / whitespace / end.
      const match = /#([^.\s]+)/.exec(p.note || '');
      if (!match) { unmatched++; continue; }
      const token = match[1];

      // Find the invoice by internal id OR by human-readable reference.
      // Prefer a match within the same customer, then fall back to a global match.
      let invoiceRows: any[] = await query(
        'SELECT id, reference FROM sales_invoices WHERE (id = ? OR reference = ?) AND customer_id = ? LIMIT 1',
        [token, token, p.customer_id]
      );
      if (!invoiceRows || invoiceRows.length === 0) {
        invoiceRows = await query(
          'SELECT id, reference FROM sales_invoices WHERE id = ? OR reference = ? LIMIT 1',
          [token, token]
        );
      }
      if (!invoiceRows || invoiceRows.length === 0) { unmatched++; continue; }

      const invoice = invoiceRows[0];

      // 1. Create the allocation link (the whole payment went to this invoice).
      const allocationId = `pa_backfill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await query(
        `INSERT INTO payment_allocations (id, payment_id, invoice_id, amount_allocated)
         VALUES (?, ?, ?, ?)`,
        [allocationId, p.id, invoice.id, Number(p.amount)]
      );
      linked++;

      // 2. Rewrite the note to use the readable reference if it used the internal id.
      if (invoice.reference && token !== invoice.reference) {
        const newNote = (p.note as string).split(`#${token}`).join(`#${invoice.reference}`);
        if (newNote !== p.note) {
          await query('UPDATE customer_payments SET note = ? WHERE id = ?', [newNote, p.id]);
          noteFixed++;
        }
      }
    }

    console.log(`✅ Backfill complete — scanned ${payments.length}, linked ${linked}, notes fixed ${noteFixed}, unmatched ${unmatched}`);
  },

  async down(): Promise<void> {
    // Remove only the rows this backfill created (id prefix is unique to it).
    await query("DELETE FROM payment_allocations WHERE id LIKE 'pa_backfill_%'");
    console.log('✅ Backfilled payment allocations removed (notes are left as-is)');
  }
};

registerMigration(migration);
