import { query } from '@/lib/mysql';

let ensured = false;

/**
 * Ensures the `customers.credit_balance` column exists. This holds the customer's
 * available advance/store credit (e.g. from overpayments), distinct from
 * `credit_limit` which caps how much they are allowed to charge.
 *
 * Cached per process so it only hits INFORMATION_SCHEMA once.
 */
export async function ensureCustomerCreditColumn(): Promise<void> {
  if (ensured) return;
  try {
    const cols = (await query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'customers' AND TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'credit_balance'"
    )) as any[];
    if (!cols || cols.length === 0) {
      await query('ALTER TABLE customers ADD COLUMN credit_balance DECIMAL(10,2) NOT NULL DEFAULT 0');
      console.log('✅ Added credit_balance column to customers');
    }
    ensured = true;
  } catch (error) {
    console.error('Error ensuring customers.credit_balance column:', error);
  }
}
