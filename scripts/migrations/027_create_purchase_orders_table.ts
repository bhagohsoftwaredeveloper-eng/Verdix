import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '027_create_purchase_orders_table',
  timestamp: '2025-12-22_13-55-00',

  async up(): Promise<void> {
    // Create purchase_orders table
    const createPurchaseOrdersTable = `
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id VARCHAR(50) PRIMARY KEY,
        supplier_id VARCHAR(50) NOT NULL,
        supplier_name VARCHAR(255) NOT NULL,
        date TIMESTAMP NOT NULL,
        total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        payment_method VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
      )
    `;

    await db.$executeRawUnsafe(createPurchaseOrdersTable);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_po_supplier_id ON purchase_orders (supplier_id)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_po_date ON purchase_orders (date)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders (status)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_po_payment_method ON purchase_orders (payment_method)`);
    
    console.log('✅ Purchase orders table created');

    // Create purchase_order_items table
    const createPurchaseOrderItemsTable = `
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id VARCHAR(50) PRIMARY KEY,
        purchase_order_id VARCHAR(50) NOT NULL,
        product_id VARCHAR(50) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        cost DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `;

    await db.$executeRawUnsafe(createPurchaseOrderItemsTable);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_poi_purchase_order_id ON purchase_order_items (purchase_order_id)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_poi_product_id ON purchase_order_items (product_id)`);
    
    console.log('✅ Purchase order items table created');
  },

  async down(): Promise<void> {
    // Drop tables in reverse order due to foreign key constraints
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS purchase_order_items CASCADE');
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS purchase_orders CASCADE');
    console.log('✅ Purchase orders tables dropped');
  }
};

registerMigration(migration);
