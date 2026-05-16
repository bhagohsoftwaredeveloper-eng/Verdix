import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../../lib/mysql';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const customerId = resolvedParams.id;

    const tablesToCheck = [
      { table: 'sales_orders', desc: 'sales orders' },
      { table: 'sales_invoices', desc: 'sales invoices' },
      { table: 'customer_payments', desc: 'customer payments' },
      { table: 'sales_transactions', desc: 'sales transactions' },
    ];

    const results = [];

    for (const check of tablesToCheck) {
      const sql = `SELECT COUNT(*) as count FROM ${check.table} WHERE customer_id = ?`;
      const rows = await query(sql, [customerId]);
      const count = rows[0]?.count || 0;
      if (count > 0) {
        results.push(check.desc);
      }
    }

    return NextResponse.json({
      success: true,
      hasTransactions: results.length > 0,
      transactionTypes: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check transactions' },
      { status: 500 }
    );
  }
}
