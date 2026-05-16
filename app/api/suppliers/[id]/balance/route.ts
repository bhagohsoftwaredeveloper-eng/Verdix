import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

/**
 * GET /api/suppliers/[id]/balance
 * Get supplier balance and transaction history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supplierId = params.id;

    // Get supplier info
    const supplierQuery = `
      SELECT * FROM suppliers WHERE id = ?
    `;
    const suppliers = await query(supplierQuery, [supplierId]);

    if (suppliers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    const supplier = suppliers[0];

    // Get total purchases
    const purchasesQuery = `
      SELECT COALESCE(SUM(total), 0) as total_purchases
      FROM purchase_orders
      WHERE supplier_id = ? AND status != 'Cancelled'
    `;
    const purchasesResult = await query(purchasesQuery, [supplierId]);
    const totalPurchases = parseFloat(purchasesResult[0]?.total_purchases || '0');

    // Get total payments
    const paymentsQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_payments
      FROM supplier_payments
      WHERE supplier_id = ?
    `;
    const paymentsResult = await query(paymentsQuery, [supplierId]);
    const totalPayments = parseFloat(paymentsResult[0]?.total_payments || '0');

    // Get transaction history
    const purchaseTransactionsQuery = `
      SELECT 
        id, 
        date, 
        total as amount, 
        status,
        'Purchase Order' as description,
        reference_number as reference
      FROM purchase_orders 
      WHERE supplier_id = ? AND status != 'Cancelled'
    `;
    const purchases = await query(purchaseTransactionsQuery, [supplierId]);

    const paymentTransactionsQuery = `
      SELECT 
        id, 
        date, 
        amount, 
        payment_method as description,
        reference
      FROM supplier_payments 
      WHERE supplier_id = ?
    `;
    const payments = await query(paymentTransactionsQuery, [supplierId]);

    // Combine and format transactions
    const transactions = [
      ...purchases.map((p: any) => ({
        type: 'PURCHASE',
        id: p.id,
        date: p.date,
        amount: parseFloat(p.amount),
        description: p.description,
        status: p.status,
        reference: p.reference,
      })),
      ...payments.map((p: any) => ({
        type: 'PAYMENT',
        id: p.id,
        date: p.date,
        amount: parseFloat(p.amount),
        description: `Payment - ${p.description}`,
        reference: p.reference,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      id: supplier.id,
      name: supplier.name,
      totalPurchases,
      totalPayments,
      balance: totalPurchases - totalPayments,
      transactions,
    });
  } catch (error) {
    console.error('Error fetching supplier balance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch supplier balance' },
      { status: 500 }
    );
  }
}
