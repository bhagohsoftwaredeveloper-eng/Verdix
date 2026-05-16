import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '009_add_account_foreign_keys_to_products',
  timestamp: '2025-12-09_11-30-00',

  async up(): Promise<void> {
    // Check if columns exist and add them if not
    const columns = ['income_account', 'expense_account'];
    let columnsAdded = false;

    for (const column of columns) {
      const result = await db.$queryRawUnsafe<any[]>(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'products'
          AND column_name = '${column}'
      `);
      if (result.length === 0) {
        const addColumnQuery = `ALTER TABLE products ADD COLUMN "${column}" VARCHAR(50)`;
        await db.$executeRawUnsafe(addColumnQuery);
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
      const result = await db.$queryRawUnsafe<any[]>(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'products'
          AND constraint_name = '${constraint.name}'
      `);
      if (result.length === 0) {
        const addFKQuery = `
          ALTER TABLE products
          ADD CONSTRAINT ${constraint.name}
          FOREIGN KEY ("${constraint.column}") REFERENCES accounts(id)
        `;
        await db.$executeRawUnsafe(addFKQuery);
        console.log(`✅ Added foreign key constraint for ${constraint.column}`);
      } else {
        console.log(`ℹ️  Foreign key constraint ${constraint.name} already exists`);
      }
    }
  },

  async down(): Promise<void> {
    // Drop foreign key constraints first
    await db.$executeRawUnsafe('ALTER TABLE products DROP CONSTRAINT fk_products_expense_account');
    await db.$executeRawUnsafe('ALTER TABLE products DROP CONSTRAINT fk_products_income_account');
    console.log('✅ Dropped foreign key constraints');

    // Drop columns
    await db.$executeRawUnsafe('ALTER TABLE products DROP COLUMN "expense_account", DROP COLUMN "income_account"');
    console.log('✅ Dropped income_account and expense_account columns');
  }
};

registerMigration(migration);
