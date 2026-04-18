import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

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
        transfer_date DATETIME NOT NULL,
        reference VARCHAR(100) DEFAULT NULL,
        status VARCHAR(20) DEFAULT 'Completed',
        notes TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_source_warehouse (source_warehouse_id),
        INDEX idx_target_warehouse (target_warehouse_id),
        INDEX idx_transfer_date (transfer_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
        INDEX idx_transfer_id (transfer_id),
        INDEX idx_product_id (product_id),
        CONSTRAINT fk_transfer_id FOREIGN KEY (transfer_id) REFERENCES inventory_transfers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await query(createTransfersSql);
    await query(createTransferItemsSql);
    
    console.log('✅ Inventory transfer tables created successfully');
  },

  async down(): Promise<void> {
    const dropItemsSql = `DROP TABLE IF EXISTS inventory_transfer_items`;
    const dropTransfersSql = `DROP TABLE IF EXISTS inventory_transfers`;
    
    await query(dropItemsSql);
    await query(dropTransfersSql);
    
    console.log('✅ Inventory transfer tables dropped successfully');
  }
};

registerMigration(migration);
