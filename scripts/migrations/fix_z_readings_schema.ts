
import { db } from '@/lib/db';

async function migrate() {
  try {
    console.log('Starting migration to fix z_readings schema...');

    // In PostgreSQL, collation mismatches are handled differently and 
    // are usually not an issue if the database was initialized correctly.
    // The main focus here is ensuring columns exist.

    // Add Missing Columns
    const columnsToAdd = [
      { name: 'min_sale_id', type: 'VARCHAR(50)' },
      { name: 'max_sale_id', type: 'VARCHAR(50)' },
      { name: 'min_void_id', type: 'VARCHAR(50)' },
      { name: 'max_void_id', type: 'VARCHAR(50)' },
      { name: 'min_return_id', type: 'VARCHAR(50)' },
      { name: 'max_return_id', type: 'VARCHAR(50)' }
    ];

    for (const col of columnsToAdd) {
      try {
        console.log(`Adding column ${col.name} if not exists...`);
        await db.$executeRawUnsafe(`ALTER TABLE z_readings ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        console.log(`Column ${col.name} verified.`);
      } catch (err: any) {
        console.error(`❌ Failed to add column ${col.name}:`, err);
        throw err;
      }
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  process.exit(0);
}

migrate();
