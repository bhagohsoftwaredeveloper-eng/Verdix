import { registerMigration, Migration } from './runner';
import { query } from '../../src/lib/mysql';

const migration: Migration = {
  name: '015_alter_sales_orders_add_new_fields',
  timestamp: '2025-12-10_17-03-00',

  async up(): Promise<void> {
    // Check if columns exist and add them if not
    const columns = [
      { name: 'shipping', definition: 'DECIMAL(10,2) DEFAULT 0.00 AFTER total' },
      { name: 'warehouse_id', definition: 'VARCHAR(50) AFTER shipping' },
      { name: 'sales_person_id', definition: 'VARCHAR(50) AFTER warehouse_id' },
      { name: 'note', definition: 'TEXT AFTER sales_person_id' }
    ];

    let columnsAdded = false;
    for (const column of columns) {
      const result = await query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'sales_orders'
          AND COLUMN_NAME = '${column.name}'
      `);
      if (result.length === 0) {
        const alterQuery = `ALTER TABLE sales_orders ADD COLUMN ${column.name} ${column.definition}`;
        await query(alterQuery);
        columnsAdded = true;
      }
    }

    // Check if indexes exist and add them if not
    const indexes = [
      { name: 'idx_warehouse_id', column: 'warehouse_id' },
      { name: 'idx_sales_person_id', column: 'sales_person_id' }
    ];

    for (const index of indexes) {
      const result = await query(`
        SELECT INDEX_NAME
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'sales_orders'
          AND INDEX_NAME = '${index.name}'
      `);
      if (result.length === 0) {
        const alterQuery = `ALTER TABLE sales_orders ADD INDEX ${index.name} (${index.column})`;
        await query(alterQuery);
        columnsAdded = true;
      }
    }

    if (columnsAdded) {
      console.log('✅ Sales orders table altered with new fields: shipping, warehouse_id, sales_person_id, note');
    } else {
      console.log('ℹ️  Sales orders table already has the required fields');
    }
  },

  async down(): Promise<void> {
    // Remove the added columns
    const dropColumns = `
      ALTER TABLE sales_orders
      DROP COLUMN shipping,
      DROP COLUMN warehouse_id,
      DROP COLUMN sales_person_id,
      DROP COLUMN note
    `;

    await query(dropColumns);
    console.log('✅ New fields removed from sales orders table');
  }
};

registerMigration(migration);
