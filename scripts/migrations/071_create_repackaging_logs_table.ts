import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '071_create_repackaging_logs_table',
  timestamp: '2026-04-16_07-00-00',

  async up(): Promise<void> {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS repackaging_logs (
        id VARCHAR(100) PRIMARY KEY,
        source_product_id VARCHAR(100) NOT NULL,
        source_product_name VARCHAR(255) NOT NULL,
        source_qty DECIMAL(15, 4) NOT NULL,
        target_product_id VARCHAR(100) NOT NULL,
        target_product_name VARCHAR(255) NOT NULL,
        target_qty_produced DECIMAL(15, 4) NOT NULL,
        factor DECIMAL(15, 4) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'completed',
        approval_queue_id VARCHAR(100) NULL,
        notes TEXT NULL,
        created_by VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_repackaging_source_product ON repackaging_logs (source_product_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_repackaging_target_product ON repackaging_logs (target_product_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_repackaging_created_at ON repackaging_logs (created_at)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_repackaging_status ON repackaging_logs (status)');
    
    console.log('✅ repackaging_logs table created');
  },

  async down(): Promise<void> {
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS repackaging_logs');
    console.log('✅ repackaging_logs table dropped');
  }
};

registerMigration(migration);
