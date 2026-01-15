import { registerMigration, Migration } from './runner';
import { query } from '../../src/lib/mysql';

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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_description (description)
      )
    `;

    await query(createLoyaltyPointsSettingsTable);
    console.log('✅ Loyalty points settings table created');
  },

  async down(): Promise<void> {
    // Drop the table
    await query('DROP TABLE IF EXISTS loyalty_points_settings');
    console.log('✅ Loyalty points settings table dropped');
  }
};

registerMigration(migration);
