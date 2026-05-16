import { registerMigration, Migration } from './runner';
import { query } from '@/lib/mysql';

const migration: Migration = {
  name: '030_create_users_table',
  timestamp: '2025-12-30_12-00-00',

  async up(): Promise<void> {
    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        uid VARCHAR(255) PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(255),
        photo_url VARCHAR(500),
        disabled BOOLEAN DEFAULT FALSE,
        creation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_disabled (disabled)
      )
    `);

    console.log('✅ Users table created');
  },

  async down(): Promise<void> {
    await query('DROP TABLE IF EXISTS users');
    console.log('✅ Users table dropped');
  }
};

registerMigration(migration);
