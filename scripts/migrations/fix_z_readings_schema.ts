
import { query } from '../../lib/mysql';

async function migrate() {
  try {
    console.log('Starting migration to fix z_readings schema...');

    // 1. Fix Collation Mismatch
    // pos_terminals.id is utf8mb4_0900_ai_ci
    // z_readings.terminal_id is utf8mb4_unicode_ci
    console.log('Fixing collation for z_readings.terminal_id...');
    await query(`
      ALTER TABLE z_readings 
      MODIFY COLUMN terminal_id VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci
    `);
    console.log('Collation fixed.');

    // 2. Add Missing Columns
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
        console.log(`Adding column ${col.name}...`);
        await query(`ALTER TABLE z_readings ADD COLUMN ${col.name} ${col.type}`);
        console.log(`Column ${col.name} added.`);
      } catch (err: any) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`Column ${col.name} already exists.`);
        } else {
          throw err;
        }
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
