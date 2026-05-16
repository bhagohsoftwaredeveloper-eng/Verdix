import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

const migration: Migration = {
  name: '060_alter_loyalty_points_precision',
  timestamp: '2026-03-17_10-10-00',

  async up(): Promise<void> {
    console.log('--- ALTERING LOYALTY POINTS PRECISION ---');

    // 1. Alter customers table
    await query('ALTER TABLE customers MODIFY COLUMN loyalty_points DECIMAL(15,3) DEFAULT 0.000');
    console.log('✅ Altered customers.loyalty_points to DECIMAL(15,3)');

    // 2. Alter customer_loyalty table
    await query('ALTER TABLE customer_loyalty MODIFY COLUMN current_points DECIMAL(15,3) DEFAULT 0.000');
    console.log('✅ Altered customer_loyalty.current_points to DECIMAL(15,3)');

    // 3. Alter point_history table (if points column is INT)
    const pointHistoryColumns: any = await query('DESCRIBE point_history');
    const pointsCol = pointHistoryColumns.find((c: any) => c.Field === 'points');
    if (pointsCol && pointsCol.Type.toLowerCase().includes('int')) {
        await query('ALTER TABLE point_history MODIFY COLUMN points DECIMAL(15,3) NOT NULL');
        console.log('✅ Altered point_history.points to DECIMAL(15,3)');
    }
  },

  async down(): Promise<void> {
    await query('ALTER TABLE customers MODIFY COLUMN loyalty_points INT DEFAULT 0');
    await query('ALTER TABLE customer_loyalty MODIFY COLUMN current_points INT DEFAULT 0');
    await query('ALTER TABLE point_history MODIFY COLUMN points INT NOT NULL');
    console.log('✅ Reverted loyalty points columns to INT');
  }
};

registerMigration(migration);
