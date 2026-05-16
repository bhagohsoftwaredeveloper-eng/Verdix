import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '067_add_quantity_to_product_shelves',
  timestamp: '067',

  async up(): Promise<void> {
    try {
      console.log('Adding quantity column to product_shelves...');

      const addQuantityColumn = `
        ALTER TABLE product_shelves
        ADD COLUMN quantity INT NOT NULL DEFAULT 0
      `;

      await query(addQuantityColumn);
      console.log('✅ Quantity column added to product_shelves');

      // Initialize quantity for existing records
      // We'll set the quantity to the product's total stock for its primary shelf assignment
      // Note: If a product has multiple shelf assignments, this might lead to over-counting if we just copy stock to each,
      // but in the current system, updateProductShelfLocations only keeps ONE shelf per product at a time for transfers.
      // A safer approach is to only assign quantity if it's the only shelf.
      
      console.log('Initializing shelf quantities from product stock...');
      const initializeQuantities = `
        UPDATE product_shelves ps
        JOIN products p ON ps.product_id = p.id
        SET ps.quantity = p.stock
        WHERE (SELECT COUNT(*) FROM (SELECT * FROM product_shelves) as ps2 WHERE ps2.product_id = ps.product_id) = 1
      `;
      
      await query(initializeQuantities);
      console.log('✅ Initialized shelf quantities');

    } catch (error) {
      console.error('❌ Error adding quantity column:', error);
      throw error;
    }
  },

  async down(): Promise<void> {
    try {
      console.log('Removing quantity column from product_shelves...');
      await query('ALTER TABLE product_shelves DROP COLUMN quantity');
      console.log('✅ Quantity column removed');
    } catch (error) {
      console.error('❌ Error removing quantity column:', error);
      throw error;
    }
  }
};

registerMigration(migration);
