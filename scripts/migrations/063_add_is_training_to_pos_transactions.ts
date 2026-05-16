import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

export const migration: Migration = {
  name: '063_add_is_training_to_pos_transactions',
  timestamp: '2026-03-17_16-35-00',
  
  async up() {
    console.log('Running migration: 063_add_is_training_to_pos_transactions');
    
    try {
      await query(`ALTER TABLE pos_transactions ADD COLUMN is_training BOOLEAN DEFAULT FALSE`);
      console.log(`✅ Added is_training to pos_transactions`);
    } catch (e: any) {
      if (e.code === 'ER_DUP_COLUMN_NAME' || e.errno === 1060) {
        console.log(`⚠️ Column is_training already exists in pos_transactions`);
      } else {
        throw e;
      }
    }
  },
  
  async down() {
    console.log('Rolling back migration: 063_add_is_training_to_pos_transactions');
    
    await query(`
      ALTER TABLE pos_transactions
      DROP COLUMN is_training
    `);
  }
};

registerMigration(migration);
