import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '029_create_user_permissions_table',
  timestamp: '2025-12-29_12-00-00',

  async up(): Promise<void> {
    // Create user_permissions table to store permissions for users
    const createUserPermissionsTable = `
      CREATE TABLE IF NOT EXISTS user_permissions (
        id VARCHAR(50) PRIMARY KEY,
        user_uid VARCHAR(255) NOT NULL,
        permission VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_user_permission UNIQUE (user_uid, permission)
      )
    `;

    await db.$executeRawUnsafe(createUserPermissionsTable);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_user_uid ON user_permissions (user_uid)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_permission ON user_permissions (permission)`);
    
    console.log('✅ User permissions table created');
  },

  async down(): Promise<void> {
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS user_permissions CASCADE');
    console.log('✅ User permissions table dropped');
  }
};

registerMigration(migration);
