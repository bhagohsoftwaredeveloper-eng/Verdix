import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '078_alter_stock_precision',
  timestamp: '078',

  async up(): Promise<void> {
    console.log('--- ALTERING STOCK PRECISION TO DECIMAL ---');

    try {
        // 1. Alter products table
        await db.$executeRawUnsafe(`
            ALTER TABLE products 
            ALTER COLUMN stock TYPE DECIMAL(15, 4) USING stock::DECIMAL(15, 4),
            ALTER COLUMN stock SET DEFAULT 0,
            ALTER COLUMN reorder_point TYPE DECIMAL(15, 4) USING reorder_point::DECIMAL(15, 4),
            ALTER COLUMN reorder_point SET DEFAULT 0
        `);
        console.log('✅ Altered products (stock, reorder_point) to DECIMAL(15, 4)');

        // 2. Alter product_shelves table
        await db.$executeRawUnsafe(`
            ALTER TABLE product_shelves 
            ALTER COLUMN quantity TYPE DECIMAL(15, 4) USING quantity::DECIMAL(15, 4),
            ALTER COLUMN quantity SET NOT NULL,
            ALTER COLUMN quantity SET DEFAULT 0
        `);
        console.log('✅ Altered product_shelves.quantity to DECIMAL(15, 4)');

        // 3. Alter stock_adjustments table
        await db.$executeRawUnsafe(`
            ALTER TABLE stock_adjustments 
            ALTER COLUMN quantity TYPE DECIMAL(15, 4) USING quantity::DECIMAL(15, 4),
            ALTER COLUMN quantity SET NOT NULL,
            ALTER COLUMN new_stock TYPE DECIMAL(15, 4) USING new_stock::DECIMAL(15, 4),
            ALTER COLUMN new_stock SET NOT NULL
        `);
        console.log('✅ Altered stock_adjustments (quantity, new_stock) to DECIMAL(15, 4)');

        // 4. Alter stock_movements table
        await db.$executeRawUnsafe(`
            ALTER TABLE stock_movements 
            ALTER COLUMN quantity_change TYPE DECIMAL(15, 4) USING quantity_change::DECIMAL(15, 4),
            ALTER COLUMN quantity_change SET NOT NULL,
            ALTER COLUMN previous_stock TYPE DECIMAL(15, 4) USING previous_stock::DECIMAL(15, 4),
            ALTER COLUMN previous_stock SET NOT NULL,
            ALTER COLUMN new_stock TYPE DECIMAL(15, 4) USING new_stock::DECIMAL(15, 4),
            ALTER COLUMN new_stock SET NOT NULL
        `);
        console.log('✅ Altered stock_movements (quantity_change, previous_stock, new_stock) to DECIMAL(15, 4)');
    } catch (error: any) {
        console.error('❌ Failed to alter stock precision:', error);
        throw error;
    }
  },

  async down(): Promise<void> {
    console.log('--- REVERTING STOCK PRECISION TO INT ---');
    try {
        await db.$executeRawUnsafe(`
            ALTER TABLE products 
            ALTER COLUMN stock TYPE INT USING stock::INTEGER,
            ALTER COLUMN stock SET DEFAULT 0,
            ALTER COLUMN reorder_point TYPE INT USING reorder_point::INTEGER,
            ALTER COLUMN reorder_point SET DEFAULT 0
        `);
        await db.$executeRawUnsafe(`
            ALTER TABLE product_shelves 
            ALTER COLUMN quantity TYPE INT USING quantity::INTEGER,
            ALTER COLUMN quantity SET NOT NULL,
            ALTER COLUMN quantity SET DEFAULT 0
        `);
        await db.$executeRawUnsafe(`
            ALTER TABLE stock_adjustments 
            ALTER COLUMN quantity TYPE INT USING quantity::INTEGER,
            ALTER COLUMN quantity SET NOT NULL,
            ALTER COLUMN new_stock TYPE INT USING new_stock::INTEGER,
            ALTER COLUMN new_stock SET NOT NULL
        `);
        await db.$executeRawUnsafe(`
            ALTER TABLE stock_movements 
            ALTER COLUMN quantity_change TYPE INT USING quantity_change::INTEGER,
            ALTER COLUMN quantity_change SET NOT NULL,
            ALTER COLUMN previous_stock TYPE INT USING previous_stock::INTEGER,
            ALTER COLUMN previous_stock SET NOT NULL,
            ALTER COLUMN new_stock TYPE INT USING new_stock::INTEGER,
            ALTER COLUMN new_stock SET NOT NULL
        `);
        console.log('✅ Reverted stock columns to INT');
    } catch (error: any) {
        console.error('❌ Failed to revert stock precision:', error);
        throw error;
    }
  }
};

registerMigration(migration);
