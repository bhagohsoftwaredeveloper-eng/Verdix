import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '067_add_quantity_to_product_shelves',
  timestamp: '067',

  async up(): Promise<void> {
    try {
      console.log('Adding quantity column to product_shelves...');

      const addQuantityColumn = `
        ALTER TABLE product_shelves
        ADD COLUMN quantity DECIMAL(15, 4) NOT NULL DEFAULT 0
      `;

      await db.$executeRawUnsafe(addQuantityColumn);
      console.log('✅ Quantity column added to product_shelves');

      // Initialize quantity for existing records
      console.log('Initializing shelf quantities from product stock...');
      const initializeQuantities = `
        UPDATE product_shelves ps
        SET quantity = p.stock
        FROM products p
        WHERE ps.product_id = p.id
        AND (SELECT COUNT(*) FROM product_shelves ps2 WHERE ps2.product_id = ps.product_id) = 1
      `;
      
      await db.$executeRawUnsafe(initializeQuantities);
      console.log('✅ Initialized shelf quantities');

    } catch (error) {
      console.error('❌ Error adding quantity column:', error);
      throw error;
    }
  },

  async down(): Promise<void> {
    try {
      console.log('Removing quantity column from product_shelves...');
      await db.$executeRawUnsafe('ALTER TABLE product_shelves DROP COLUMN IF EXISTS quantity');
      console.log('✅ Quantity column removed');
    } catch (error) {
      console.error('❌ Error removing quantity column:', error);
      throw error;
    }
  }
};

registerMigration(migration);
