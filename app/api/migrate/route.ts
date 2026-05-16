import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting sales orders table migration for PostgreSQL...');

    // Add new columns to sales_orders table
    // PostgreSQL doesn't support AFTER. Columns are added at the end.
    // Also, we do it in separate steps or one ALTER TABLE without AFTER.
    const alterTableSQL = `
      ALTER TABLE sales_orders
      ADD COLUMN IF NOT EXISTS shipping DECIMAL(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS warehouse_id VARCHAR(50),
      ADD COLUMN IF NOT EXISTS sales_person_id VARCHAR(50),
      ADD COLUMN IF NOT EXISTS note TEXT
    `;

    await db.$executeRawUnsafe(alterTableSQL);
    
    // Create indexes separately as Postgres doesn't support ADD INDEX in ALTER TABLE
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_sales_orders_warehouse_id ON sales_orders(warehouse_id)`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_sales_orders_sales_person_id ON sales_orders(sales_person_id)`);
    
    console.log('✅ Sales orders table altered with new fields: shipping, warehouse_id, sales_person_id, note');

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully. New fields added to sales_orders table.'
    });

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Migration failed',
        details: 'There was a database error during migration.'
      },
      { status: 500 }
    );
  }
}
