import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '060_alter_loyalty_points_precision',
  timestamp: '2026-03-17_10-10-00',

  async up(): Promise<void> {
    console.log('--- ALTERING LOYALTY POINTS PRECISION ---');

    // 1. Alter customers table
    await db.$executeRawUnsafe('ALTER TABLE customers ALTER COLUMN loyalty_points TYPE DECIMAL(15,3), ALTER COLUMN loyalty_points SET DEFAULT 0.000');
    console.log('✅ Altered customers.loyalty_points to DECIMAL(15,3)');

    // 2. Alter customer_loyalty table
    await db.$executeRawUnsafe('ALTER TABLE customer_loyalty ALTER COLUMN current_points TYPE DECIMAL(15,3), ALTER COLUMN current_points SET DEFAULT 0.000');
    console.log('✅ Altered customer_loyalty.current_points to DECIMAL(15,3)');

    // 3. Alter point_history table (if points column is INT)
    const pointHistoryColumns: any = await db.$queryRawUnsafe(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'point_history' AND column_name = 'points'
    `);
    
    if (pointHistoryColumns.length > 0 && pointHistoryColumns[0].data_type.toLowerCase().includes('int')) {
        await db.$executeRawUnsafe('ALTER TABLE point_history ALTER COLUMN points TYPE DECIMAL(15,3)');
        console.log('✅ Altered point_history.points to DECIMAL(15,3)');
    }
  },

  async down(): Promise<void> {
    await db.$executeRawUnsafe('ALTER TABLE customers ALTER COLUMN loyalty_points TYPE DECIMAL(15,0), ALTER COLUMN loyalty_points SET DEFAULT 0');
    await db.$executeRawUnsafe('ALTER TABLE customer_loyalty ALTER COLUMN current_points TYPE DECIMAL(15,0), ALTER COLUMN current_points SET DEFAULT 0');
    await db.$executeRawUnsafe('ALTER TABLE point_history ALTER COLUMN points TYPE DECIMAL(15,0)');
    console.log('✅ Reverted loyalty points columns to DECIMAL(15,0) (equivalent to INT precision)');
  }
};

registerMigration(migration);
