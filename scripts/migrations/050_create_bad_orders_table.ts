import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '050_create_bad_orders_table',
  timestamp: '2026-02-10_15-50-00',

  async up(): Promise<void> {
    // Create bad_orders table
    const createBadOrdersTable = `
      CREATE TABLE IF NOT EXISTS bad_orders (
        id VARCHAR(50) PRIMARY KEY,
        purchase_order_id VARCHAR(50) NOT NULL,
        supplier_id VARCHAR(50) NOT NULL,
        supplier_name VARCHAR(255) NOT NULL,
        reported_by VARCHAR(255),
        report_date TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'Reported',
        total_affected_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        notes TEXT,
        resolution_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT bad_orders_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
        CONSTRAINT bad_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
      )
    `;

    await db.$executeRawUnsafe(createBadOrdersTable);
    
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_bad_orders_purchase_order_id ON bad_orders (purchase_order_id)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_bad_orders_supplier_id ON bad_orders (supplier_id)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_bad_orders_report_date ON bad_orders (report_date)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_bad_orders_status ON bad_orders (status)`);
    
    console.log('✅ Bad orders table created');

    // Create bad_order_items table
    const createBadOrderItemsTable = `
      CREATE TABLE IF NOT EXISTS bad_order_items (
        id VARCHAR(50) PRIMARY KEY,
        bad_order_id VARCHAR(50) NOT NULL,
        product_id VARCHAR(50) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        cost DECIMAL(10,2) NOT NULL,
        reason VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT bad_order_items_bad_order_id_fkey FOREIGN KEY (bad_order_id) REFERENCES bad_orders(id) ON DELETE CASCADE,
        CONSTRAINT bad_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `;

    await db.$executeRawUnsafe(createBadOrderItemsTable);
    
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_bad_order_items_bad_order_id ON bad_order_items (bad_order_id)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_bad_order_items_product_id ON bad_order_items (product_id)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_bad_order_items_reason ON bad_order_items (reason)`);
    
    console.log('✅ Bad order items table created');
  },

  async down(): Promise<void> {
    // Drop tables in reverse order due to foreign key constraints
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS bad_order_items');
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS bad_orders');
    console.log('✅ Bad orders tables dropped');
  }
};

registerMigration(migration);
