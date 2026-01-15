import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_permission (user_uid, permission),
        INDEX idx_user_uid (user_uid),
        INDEX idx_permission (permission)
      )
    `;

    await query(createUserPermissionsTable);
    console.log('✅ User permissions table created');
  },

  async down(): Promise<void> {
    await query('DROP TABLE IF EXISTS user_permissions');
    console.log('✅ User permissions table dropped');
  }
};

registerMigration(migration);
