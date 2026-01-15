import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '028_drop_account_foreign_keys_from_products',
  timestamp: '2025-01-05_19-30-00',

  async up(): Promise<void> {
    try {
      console.log('Dropping account foreign key constraints from products table...');

      // Drop foreign key constraints
      const constraints = ['fk_products_income_account', 'fk_products_expense_account'];

      for (const constraint of constraints) {
        const result = await query(`
          SELECT CONSTRAINT_NAME
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'products'
            AND CONSTRAINT_NAME = '${constraint}'
        `);

        if (result.length > 0) {
          await query(`ALTER TABLE products DROP FOREIGN KEY ${constraint}`);
          console.log(`✅ Dropped foreign key constraint ${constraint}`);
        } else {
          console.log(`ℹ️  Foreign key constraint ${constraint} does not exist`);
        }
      }

    } catch (error) {
      console.error('❌ Error dropping account foreign keys from products:', error);
      throw error;
    }
  },

  async down(): Promise<void> {
    try {
      console.log('Restoring account foreign key constraints to products table...');

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
          console.log(`✅ Restored foreign key constraint ${constraint.name}`);
        } else {
          console.log(`ℹ️  Foreign key constraint ${constraint.name} already exists`);
        }
      }

    } catch (error) {
      console.error('❌ Error restoring account foreign keys to products:', error);
      throw error;
    }
  }
};

registerMigration(migration);
