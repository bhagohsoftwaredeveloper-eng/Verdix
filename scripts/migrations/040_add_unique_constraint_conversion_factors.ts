import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '040_add_unique_constraint_conversion_factors',
  timestamp: '2026-02-05_18-00-00',

  async up(): Promise<void> {
    // First, check for and remove any duplicate entries
    const checkDuplicates = `
      SELECT product_id, unit, COUNT(*) as count
      FROM conversion_factors
      GROUP BY product_id, unit
      HAVING count > 1
    `;
    
    const duplicates = await query(checkDuplicates);
    
    if (duplicates.length > 0) {
      console.log('⚠️  Found duplicate conversion factors, cleaning up...');
      
      // For each duplicate, keep only the most recent one
      for (const dup of duplicates) {
        const keepNewest = `
          DELETE FROM conversion_factors
          WHERE product_id = ? AND unit = ?
          AND id NOT IN (
            SELECT id FROM (
              SELECT id FROM conversion_factors
              WHERE product_id = ? AND unit = ?
              ORDER BY created_at DESC
              LIMIT 1
            ) as temp
          )
        `;
        await query(keepNewest, [dup.product_id, dup.unit, dup.product_id, dup.unit]);
      }
      
      console.log(`✅ Cleaned up ${duplicates.length} duplicate conversion factor entries`);
    }

    // Add unique constraint
    const addConstraint = `
      ALTER TABLE conversion_factors
      ADD UNIQUE KEY unique_product_unit (product_id, unit)
    `;
    
    await query(addConstraint);
    console.log('✅ Added unique constraint to conversion_factors table');
  },

  async down(): Promise<void> {
    const dropConstraint = `
      ALTER TABLE conversion_factors
      DROP INDEX unique_product_unit
    `;
    
    await query(dropConstraint);
    console.log('✅ Removed unique constraint from conversion_factors table');
  }
};

registerMigration(migration);
