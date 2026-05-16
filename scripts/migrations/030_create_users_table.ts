import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '030_create_users_table',
  timestamp: '2025-12-30_12-00-00',

  async up(): Promise<void> {
    // Create users table
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS users (
        uid VARCHAR(255) PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(255),
        photo_url VARCHAR(500),
        disabled BOOLEAN DEFAULT FALSE,
        creation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_username ON users (username)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_disabled ON users (disabled)`);

    console.log('✅ Users table created');
  },

  async down(): Promise<void> {
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS users CASCADE');
    console.log('✅ Users table dropped');
  }
};

registerMigration(migration);
