import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '023_add_warehouse_foreign_key_to_products',
  timestamp: '023',

  async up(): Promise<void> {
    try {
      console.log('Adding warehouse foreign key to products table...');

      // Check if warehouse_id column exists and add it if not
      const columnResult = await db.$queryRawUnsafe<any[]>(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'products'
          AND column_name = 'warehouse_id'
      `);

      if (columnResult.length === 0) {
        const addColumnQuery = `ALTER TABLE products ADD COLUMN warehouse_id VARCHAR(50)`;
        await db.$executeRawUnsafe(addColumnQuery);
        console.log('✅ Added warehouse_id column to products table');
      } else {
        console.log('ℹ️  warehouse_id column already exists');
      }

      // Check if foreign key constraint exists and add it if not
      const fkResult = await db.$queryRawUnsafe<any[]>(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'products'
          AND constraint_name = 'fk_products_warehouse'
      `);

      if (fkResult.length === 0) {
        const addFKQuery = `
          ALTER TABLE products
          ADD CONSTRAINT fk_products_warehouse
          FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
          ON DELETE SET NULL
        `;
        await db.$executeRawUnsafe(addFKQuery);
        console.log('✅ Added foreign key constraint for warehouse_id with ON DELETE SET NULL');
      } else {
        console.log('ℹ️  Foreign key constraint fk_products_warehouse already exists');
      }

      // Update existing products to have default warehouse
      const updateQuery = `
        UPDATE products
        SET warehouse_id = 'wh_main'
        WHERE warehouse_id IS NULL
      `;
      await db.$executeRawUnsafe(updateQuery);
      console.log('✅ Updated existing products with default warehouse');

    } catch (error) {
      console.error('❌ Error adding warehouse foreign key to products:', error);
      throw error;
    }
  },

  async down(): Promise<void> {
    try {
      console.log('Removing warehouse foreign key from products table...');

      // Drop foreign key constraint
      await db.$executeRawUnsafe('ALTER TABLE products DROP CONSTRAINT fk_products_warehouse');
      console.log('✅ Dropped foreign key constraint');

      // Drop column
      await db.$executeRawUnsafe('ALTER TABLE products DROP COLUMN warehouse_id');
      console.log('✅ Dropped warehouse_id column');

    } catch (error) {
      console.error('❌ Error removing warehouse foreign key from products:', error);
      throw error;
    }
  }
};

registerMigration(migration);
