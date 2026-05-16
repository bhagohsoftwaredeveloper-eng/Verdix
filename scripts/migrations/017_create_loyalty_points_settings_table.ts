import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '017_create_loyalty_points_settings_table',
  timestamp: '2025-12-15_09-03-00',

  async up(): Promise<void> {
    // Create loyalty_points_settings table
    const createLoyaltyPointsSettingsTable = `
      CREATE TABLE IF NOT EXISTS loyalty_points_settings (
        id VARCHAR(50) PRIMARY KEY,
        description VARCHAR(255) NOT NULL,
        base DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        equivalent DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await db.$executeRawUnsafe(createLoyaltyPointsSettingsTable);
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_loyalty_points_settings_description ON loyalty_points_settings(description)');
    console.log('✅ Loyalty points settings table created');
  },

  async down(): Promise<void> {
    // Drop the table
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS loyalty_points_settings');
    console.log('✅ Loyalty points settings table dropped');
  }
};

registerMigration(migration);
