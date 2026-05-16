import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '074_create_inventory_transfers_table',
  timestamp: '2026-04-17_11-46-00',

  async up(): Promise<void> {
    // 1. Create inventory_transfers table
    const createTransfersSql = `
      CREATE TABLE IF NOT EXISTS inventory_transfers (
        id VARCHAR(50) PRIMARY KEY,
        source_warehouse_id VARCHAR(50) NOT NULL,
        target_warehouse_id VARCHAR(50) NOT NULL,
        transfer_date TIMESTAMP NOT NULL,
        reference VARCHAR(100) DEFAULT NULL,
        status VARCHAR(20) DEFAULT 'Completed',
        notes TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 2. Create inventory_transfer_items table
    const createTransferItemsSql = `
      CREATE TABLE IF NOT EXISTS inventory_transfer_items (
        id VARCHAR(50) PRIMARY KEY,
        transfer_id VARCHAR(50) NOT NULL,
        product_id VARCHAR(50) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(15, 4) NOT NULL,
        unit_of_measure VARCHAR(50) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_transfer_id FOREIGN KEY (transfer_id) REFERENCES inventory_transfers(id) ON DELETE CASCADE
      )
    `;

    await db.$executeRawUnsafe(createTransfersSql);
    await db.$executeRawUnsafe(createTransferItemsSql);
    
    // Create indexes for Postgres
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_source_warehouse ON inventory_transfers (source_warehouse_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_target_warehouse ON inventory_transfers (target_warehouse_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_transfer_date ON inventory_transfers (transfer_date)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_transfer_id ON inventory_transfer_items (transfer_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_product_id ON inventory_transfer_items (product_id)');
    
    console.log('✅ Inventory transfer tables created successfully');
  },

  async down(): Promise<void> {
    await db.$executeRawUnsafe(`DROP TABLE IF EXISTS inventory_transfer_items`);
    await db.$executeRawUnsafe(`DROP TABLE IF EXISTS inventory_transfers`);
    
    console.log('✅ Inventory transfer tables dropped successfully');
  }
};

registerMigration(migration);
