import { registerMigration, Migration } from './runner';
import { query } from '../../src/lib/mysql';

const migration: Migration = {
  name: '007_alter_suppliers_table_add_fields',
  timestamp: '2025-11-27_10-48-00',

  async up(): Promise<void> {
    // Check if columns exist and add them if not
    const columns = [
      { name: 'address', definition: 'TEXT' },
      { name: 'payment_terms', definition: 'VARCHAR(100)' },
      { name: 'markup_percentage', definition: 'DECIMAL(5,2)' }
    ];

    for (const column of columns) {
      const result = await query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'suppliers'
          AND COLUMN_NAME = '${column.name}'
      `);
      if (result.length === 0) {
        const alterQuery = `ALTER TABLE suppliers ADD COLUMN ${column.name} ${column.definition}`;
        await query(alterQuery);
        console.log(`✅ Added ${column.name} column to suppliers table`);
      } else {
        console.log(`ℹ️  ${column.name} column already exists, skipping add`);
      }
    }
  },

  async down(): Promise<void> {
    // Remove the added columns
    const columnsToRemove = ['address', 'payment_terms', 'markup_percentage'];

    for (const column of columnsToRemove) {
      const alterQuery = `ALTER TABLE suppliers DROP COLUMN IF EXISTS ${column}`;
      await query(alterQuery);
      console.log(`✅ Removed ${column} column from suppliers table`);
    }
  }
};

registerMigration(migration);
