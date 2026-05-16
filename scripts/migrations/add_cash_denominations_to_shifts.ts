import { db } from '../../lib/db';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: '../../.env' });

async function migrate() {
  try {
    console.log('Verifying database connection...');
    await db.$connect();
    console.log('Connected.');

    console.log('Checking for cash_denominations column in shifts table...');
    
    // Check if column exists in PostgreSQL
    const columnExists: any[] = await db.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'shifts' AND column_name = 'cash_denominations'
    `;

    if (columnExists.length === 0) {
        console.log('Adding cash_denominations column to shifts table...');
        // Using JSONB for PostgreSQL which is the default mapping for Prisma Json type
        await db.$executeRawUnsafe(`
            ALTER TABLE shifts
            ADD COLUMN cash_denominations JSONB
        `);
        console.log('Column cash_denominations added successfully.');
    } else {
        console.log('Column cash_denominations already exists.');
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

migrate();
