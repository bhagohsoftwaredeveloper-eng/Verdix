import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '009_add_account_foreign_keys_to_products',
  timestamp: '2025-12-09_11-30-00',

  async up(): Promise<void> {
    // Check if columns exist and add them if not
    const columns = ['income_account', 'expense_account'];
    let columnsAdded = false;

    for (const column of columns) {
      const result = await query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'products'
          AND COLUMN_NAME = '${column}'
      `);
      if (result.length === 0) {
        const addColumnQuery = `ALTER TABLE products ADD COLUMN ${column} VARCHAR(50)`;
        await query(addColumnQuery);
        columnsAdded = true;
      }
    }

    if (columnsAdded) {
      console.log('✅ Added income_account and expense_account columns to products table');
    } else {
      console.log('ℹ️  income_account and expense_account columns already exist');
    }

    // Check if foreign key constraints exist and add them if not
    const constraints = [
      { name: 'fk_products_income_account', column: 'income_account' },
      { name: 'fk_products_expense_account', column: 'expense_account' }
    ];

    for (const constraint of constraints) {
      const result = await query(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'products'
          AND CONSTRAINT_NAME = '${constraint.name}'
      `);
      if (result.length === 0) {
        const addFKQuery = `
          ALTER TABLE products
          ADD CONSTRAINT ${constraint.name}
          FOREIGN KEY (${constraint.column}) REFERENCES accounts(id)
        `;
        await query(addFKQuery);
        console.log(`✅ Added foreign key constraint for ${constraint.column}`);
      } else {
        console.log(`ℹ️  Foreign key constraint ${constraint.name} already exists`);
      }
    }
  },

  async down(): Promise<void> {
    // Drop foreign key constraints first
    await query('ALTER TABLE products DROP FOREIGN KEY fk_products_expense_account');
    await query('ALTER TABLE products DROP FOREIGN KEY fk_products_income_account');
    console.log('✅ Dropped foreign key constraints');

    // Drop columns
    await query('ALTER TABLE products DROP COLUMN expense_account, DROP COLUMN income_account');
    console.log('✅ Dropped income_account and expense_account columns');
  }
};

registerMigration(migration);
