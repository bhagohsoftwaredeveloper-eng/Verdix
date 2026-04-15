import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';
import { v4 as uuidv4 } from 'uuid';

const migration: Migration = {
  name: '070_create_user_types_tables',
  timestamp: '2026-04-13_13-15-00',

  async up(): Promise<void> {
    // Create user_types table
    const createUserTypesTable = `
      CREATE TABLE IF NOT EXISTS user_types (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await query(createUserTypesTable);

    // Create user_type_permissions table
    const createUserTypePermissionsTable = `
      CREATE TABLE IF NOT EXISTS user_type_permissions (
        id VARCHAR(50) PRIMARY KEY,
        user_type_id VARCHAR(50) NOT NULL,
        permission VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_type_id (user_type_id),
        UNIQUE KEY unique_user_type_permission (user_type_id, permission),
        FOREIGN KEY (user_type_id) REFERENCES user_types(id) ON DELETE CASCADE
      )
    `;
    await query(createUserTypePermissionsTable);

    // Initial user types and their permissions
    const initialTypes = [
      {
        name: 'Super Admin',
        permissions: [
          'access_pos', 'view_dashboard', 'manage_products', 'manage_inventory', 
          'view_sales', 'manage_purchases', 'manage_customers', 'manage_suppliers', 
          'view_reports', 'manage_users', 'manage_settings'
        ]
      },
      {
        name: 'Admin',
        permissions: [
          'access_pos', 'view_dashboard', 'manage_products', 'manage_inventory', 
          'view_sales', 'manage_purchases', 'manage_customers', 'manage_suppliers', 
          'view_reports', 'manage_users'
        ]
      },
      {
        name: 'Staff',
        permissions: [
          'view_dashboard', 'manage_products', 'manage_inventory', 
          'view_sales', 'manage_customers', 'manage_suppliers', 'view_reports'
        ]
      },
      {
        name: 'Cashier',
        permissions: ['access_pos']
      },
      {
        name: 'User',
        permissions: ['view_dashboard']
      }
    ];

    for (const type of initialTypes) {
      const typeId = uuidv4();
      await query(
        'INSERT INTO user_types (id, name, description) VALUES (?, ?, ?)',
        [typeId, type.name, `Initial ${type.name} role`]
      );

      for (const permission of type.permissions) {
        await query(
          'INSERT INTO user_type_permissions (id, user_type_id, permission) VALUES (?, ?, ?)',
          [uuidv4(), typeId, permission]
        );
      }
    }

    console.log('✅ User types and permissions tables created and seeded');
  },

  async down(): Promise<void> {
    await query('DROP TABLE IF EXISTS user_type_permissions');
    await query('DROP TABLE IF EXISTS user_types');
    console.log('✅ User types and permissions tables dropped');
  }
};

registerMigration(migration);
