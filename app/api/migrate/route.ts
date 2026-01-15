import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting sales orders table migration...');

    // Add new columns to sales_orders table
    const alterTableSQL = `
      ALTER TABLE sales_orders
      ADD COLUMN shipping DECIMAL(10,2) DEFAULT 0.00 AFTER total,
      ADD COLUMN warehouse_id VARCHAR(50) AFTER shipping,
      ADD COLUMN sales_person_id VARCHAR(50) AFTER warehouse_id,
      ADD COLUMN note TEXT AFTER sales_person_id,
      ADD INDEX idx_warehouse_id (warehouse_id),
      ADD INDEX idx_sales_person_id (sales_person_id)
    `;

    await query(alterTableSQL);
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
        details: 'The fields may already exist or there was a database error.'
      },
      { status: 500 }
    );
  }
}
