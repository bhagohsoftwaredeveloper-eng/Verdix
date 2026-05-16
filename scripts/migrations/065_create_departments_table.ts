import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '065_create_departments_table',
  timestamp: '2026-04-13_08-00-00',

  async up(): Promise<void> {
    // 1. Create departments table
    try {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS departments (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          markup_percentage DECIMAL(10, 2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created departments table');
    } catch (error) {
      console.error('❌ Failed to create departments table:', error);
      throw error;
    }

    // 2. Add department column to products table
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE products
        ADD COLUMN department VARCHAR(255)
      `);
      console.log('✅ Added department column to products table');
    } catch (error: any) {
      if (error.code === '42701') {
        console.log('⚠️ department column already exists in products table');
      } else {
        console.error('❌ Failed to alter products table:', error);
        throw error;
      }
    }
  },

  async down(): Promise<void> {
    // 1. Remove department column from products table
    try {
      await db.$executeRawUnsafe(`ALTER TABLE products DROP COLUMN IF EXISTS department`);
      console.log('✅ Dropped department column from products table');
    } catch (error) {
      console.warn('⚠️ Failed to drop department column from products table', error);
    }

    // 2. Drop departments table
    try {
      await db.$executeRawUnsafe(`DROP TABLE IF EXISTS departments`);
      console.log('✅ Dropped departments table');
    } catch (error) {
      console.warn('⚠️ Failed to drop departments table', error);
    }
  }
};

registerMigration(migration);
