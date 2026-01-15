import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '026_update_warehouse_foreign_key_constraint',
  timestamp: '026',

  async up(): Promise<void> {
    try {
      console.log('Updating warehouse foreign key constraint to allow SET NULL on delete...');

      // Check if foreign key constraint exists
      const fkResult = await query(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'products'
          AND CONSTRAINT_NAME = 'fk_products_warehouse'
      `);

      if (fkResult.length > 0) {
        // Drop the existing foreign key constraint
        await query('ALTER TABLE products DROP FOREIGN KEY fk_products_warehouse');
        console.log('✅ Dropped existing foreign key constraint');

        // Recreate the foreign key constraint with ON DELETE SET NULL
        const addFKQuery = `
          ALTER TABLE products
          ADD CONSTRAINT fk_products_warehouse
          FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
          ON DELETE SET NULL
        `;
        await query(addFKQuery);
        console.log('✅ Recreated foreign key constraint with ON DELETE SET NULL');
      } else {
        console.log('ℹ️  Foreign key constraint does not exist, nothing to update');
      }

    } catch (error) {
      console.error('❌ Error updating warehouse foreign key constraint:', error);
      throw error;
    }
  },

  async down(): Promise<void> {
    try {
      console.log('Reverting warehouse foreign key constraint to restrict delete...');

      // Check if foreign key constraint exists
      const fkResult = await query(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'products'
          AND CONSTRAINT_NAME = 'fk_products_warehouse'
      `);

      if (fkResult.length > 0) {
        // Drop the existing foreign key constraint
        await query('ALTER TABLE products DROP FOREIGN KEY fk_products_warehouse');
        console.log('✅ Dropped existing foreign key constraint');

        // Recreate the foreign key constraint without ON DELETE SET NULL
        const addFKQuery = `
          ALTER TABLE products
          ADD CONSTRAINT fk_products_warehouse
          FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        `;
        await query(addFKQuery);
        console.log('✅ Recreated foreign key constraint without ON DELETE SET NULL');
      } else {
        console.log('ℹ️  Foreign key constraint does not exist, nothing to revert');
      }

    } catch (error) {
      console.error('❌ Error reverting warehouse foreign key constraint:', error);
      throw error;
    }
  }
};

registerMigration(migration);
