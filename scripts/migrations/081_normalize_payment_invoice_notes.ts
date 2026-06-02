import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

/**
 * Normalize payment notes so the invoice number shown in the "Payment Details"
 * dialog matches what the Statement of Account shows.
 *
 * Some payments were recorded with the internal invoice id inside their note
 * (e.g. "Payment for Invoice #inv_1780376642325_3q9phlfvh."), while the SOA
 * derives the number from the invoice's human-readable reference (INV-001057).
 * That produced a visible mismatch.
 *
 * This migration rewrites any note whose "#<token>" is an internal invoice id
 * to use that invoice's reference instead. It is idempotent — notes that already
 * use the reference are left untouched — and it does not depend on whether the
 * payment has an allocation row (unlike the 080 backfill).
 */
const migration: Migration = {
  name: '081_normalize_payment_invoice_notes',
  timestamp: '2026-06-02_00-20-00',

  async up(): Promise<void> {
    const rows: any[] = await query(
      "SELECT id, note FROM customer_payments WHERE note LIKE '%#%'"
    );

    let fixed = 0;
    for (const p of rows) {
      const note: string = p.note || '';
      const match = /#([^.\s]+)/.exec(note);
      if (!match) continue;
      const token = match[1];

      // Only rewrite when the token is an internal invoice id whose reference differs.
      const invoiceRows: any[] = await query(
        'SELECT reference FROM sales_invoices WHERE id = ? LIMIT 1',
        [token]
      );
      if (!invoiceRows || invoiceRows.length === 0) continue;

      const reference = invoiceRows[0].reference;
      if (!reference || reference === token) continue;

      const newNote = note.split(`#${token}`).join(`#${reference}`);
      if (newNote !== note) {
        await query('UPDATE customer_payments SET note = ? WHERE id = ?', [newNote, p.id]);
        fixed++;
      }
    }

    console.log(`✅ Normalized payment notes — scanned ${rows.length}, fixed ${fixed}`);
  },

  async down(): Promise<void> {
    // Not reversible — the original internal ids are not retained. No-op.
    console.log('ℹ️  081 normalize notes is not reversible (no-op on down)');
  }
};

registerMigration(migration);
