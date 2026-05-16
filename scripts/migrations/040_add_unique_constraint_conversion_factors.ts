import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '040_add_unique_constraint_conversion_factors',
  timestamp: '2026-02-05_18-00-00',

  async up(): Promise<void> {
    // First, check for and remove any duplicate entries
    const checkDuplicates = `
      SELECT product_id, unit, COUNT(*) as count
      FROM conversion_factors
      GROUP BY product_id, unit
      HAVING COUNT(*) > 1
    `;
    
    const duplicates: any[] = await db.$queryRawUnsafe(checkDuplicates);
    
    if (duplicates.length > 0) {
      console.log('⚠️  Found duplicate conversion factors, cleaning up...');
      
      // For each duplicate, keep only the most recent one
      for (const dup of duplicates) {
        const keepNewest = `
          DELETE FROM conversion_factors
          WHERE product_id = $1 AND unit = $2
          AND id NOT IN (
            SELECT id FROM conversion_factors
            WHERE product_id = $3 AND unit = $4
            ORDER BY created_at DESC
            LIMIT 1
          )
        `;
        await db.$executeRawUnsafe(keepNewest, dup.product_id, dup.unit, dup.product_id, dup.unit);
      }
      
      console.log(`✅ Cleaned up ${duplicates.length} duplicate conversion factor entries`);
    }

    // Add unique constraint
    try {
      const addConstraint = `
        ALTER TABLE conversion_factors
        ADD CONSTRAINT unique_product_unit UNIQUE (product_id, unit)
      `;
      
      await db.$executeRawUnsafe(addConstraint);
      console.log('✅ Added unique constraint to conversion_factors table');
    } catch (error: any) {
      console.log('ℹ️ Unique constraint might already exist:', error.message);
    }
  },

  async down(): Promise<void> {
    try {
      const dropConstraint = `
        ALTER TABLE conversion_factors
        DROP CONSTRAINT IF EXISTS unique_product_unit
      `;
      
      await db.$executeRawUnsafe(dropConstraint);
      console.log('✅ Removed unique constraint from conversion_factors table');
    } catch (error: any) {
      console.log('ℹ️ Could not remove unique constraint:', error.message);
    }
  }
};

registerMigration(migration);
