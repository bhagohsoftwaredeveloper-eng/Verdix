import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '015_alter_sales_orders_add_new_fields',
  timestamp: '2025-12-10_17-03-00',

  async up(): Promise<void> {
    // Add columns if they don't exist
    const columns = [
      { name: 'shipping', definition: 'DECIMAL(10,2) DEFAULT 0.00' },
      { name: 'warehouse_id', definition: 'VARCHAR(50)' },
      { name: 'sales_person_id', definition: 'VARCHAR(50)' },
      { name: 'note', definition: 'TEXT' }
    ];

    for (const column of columns) {
      const alterQuery = `ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS "${column.name}" ${column.definition}`;
      await db.$executeRawUnsafe(alterQuery);
    }

    // Add indexes if they don't exist
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_sales_orders_warehouse_id ON sales_orders(warehouse_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_sales_orders_sales_person_id ON sales_orders(sales_person_id)');

    console.log('✅ Sales orders table altered with new fields: shipping, warehouse_id, sales_person_id, note');
  },

  async down(): Promise<void> {
    // Remove the added columns
    const dropColumns = `
      ALTER TABLE sales_orders
      DROP COLUMN IF EXISTS shipping,
      DROP COLUMN IF EXISTS warehouse_id,
      DROP COLUMN IF EXISTS sales_person_id,
      DROP COLUMN IF EXISTS note
    `;

    await db.$executeRawUnsafe(dropColumns);
    console.log('✅ New fields removed from sales orders table');
  }
};

registerMigration(migration);
