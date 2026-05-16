import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '007_alter_suppliers_table_add_fields',
  timestamp: '2025-11-27_10-48-00',

  async up(): Promise<void> {
    // Add columns if they don't exist (PostgreSQL syntax)
    const columns = [
      { name: 'address', definition: 'TEXT' },
      { name: 'payment_terms', definition: 'VARCHAR(100)' },
      { name: 'markup_percentage', definition: 'DECIMAL(5,2)' }
    ];

    for (const column of columns) {
      const alterQuery = `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS ${column.name} ${column.definition}`;
      await db.$executeRawUnsafe(alterQuery);
      console.log(`✅ Ensured ${column.name} column exists in suppliers table`);
    }
  },

  async down(): Promise<void> {
    // Remove the added columns
    const columnsToRemove = ['address', 'payment_terms', 'markup_percentage'];

    for (const column of columnsToRemove) {
      const alterQuery = `ALTER TABLE suppliers DROP COLUMN IF EXISTS ${column}`;
      await db.$executeRawUnsafe(alterQuery);
      console.log(`✅ Removed ${column} column from suppliers table`);
    }
  }
};

registerMigration(migration);
