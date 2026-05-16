import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '040_alter_pos_settings_add_printer_config',
  timestamp: '2026-01-20_00-00-00',

  async up(): Promise<void> {
    try {
      console.log('Migrating: Adding printer configuration to pos_settings...');

      // Check if columns exist first to avoid errors on re-run
      const columns: any[] = await db.$queryRawUnsafe(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pos_settings' 
        AND column_name IN ('paper_size', 'print_mode');
      `);

      const existingColumns = columns.map(c => c.column_name);

      if (!existingColumns.includes('paper_size')) {
        await db.$executeRawUnsafe(`
          ALTER TABLE pos_settings
          ADD COLUMN paper_size VARCHAR(10) DEFAULT 'mm58'
        `);
        console.log('✅ Added paper_size column');
      } else {
        console.log('ℹ️ paper_size column already exists');
      }

      if (!existingColumns.includes('print_mode')) {
        await db.$executeRawUnsafe(`
          ALTER TABLE pos_settings
          ADD COLUMN print_mode VARCHAR(20) DEFAULT 'browser'
        `);
        console.log('✅ Added print_mode column');
      } else {
        console.log('ℹ️ print_mode column already exists');
      }

      console.log('Migration completed successfully.');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(): Promise<void> {
    try {
      await db.$executeRawUnsafe(`
        ALTER TABLE pos_settings
        DROP COLUMN IF EXISTS paper_size,
        DROP COLUMN IF EXISTS print_mode
      `);
      console.log('✅ Removed printer configuration from pos_settings');
    } catch (error) {
      console.error('Rollback failed:', error);
    }
  }
};

registerMigration(migration);
