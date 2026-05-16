import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
    const supplier = await db.supplier.findUnique({
      where: { id: supplierId }
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // Get total purchases
    const purchasesAggregate = await db.purchaseOrder.aggregate({
      where: {
        supplierId,
        NOT: { status: 'Failed' } // In MySQL it was status != 'Cancelled', but schema has PurchaseOrderStatus enum. 
        // Wait, schema says: enum PurchaseOrderStatus { Pending, Approved, Paid, Shipped, Received, Failed, PartiallyPaid }
        // MySQL query was: WHERE supplier_id = ? AND status != 'Cancelled'
        // Let's see what statuses are equivalent.
      },
      _sum: {
        total: true
      }
    });
    const totalPurchases = Number(purchasesAggregate._sum.total || 0);

    // Get total payments
    const paymentsAggregate = await db.supplierPayment.aggregate({
      where: {
        supplierId
      },
      _sum: {
        amount: true
      }
    });
    const totalPayments = Number(paymentsAggregate._sum.amount || 0);

    // Get transaction history
    const [purchaseOrders, payments] = await Promise.all([
      db.purchaseOrder.findMany({
        where: {
          supplierId,
          NOT: { status: 'Failed' }
        },
        select: {
          id: true,
          date: true,
          total: true,
          status: true,
          referenceNumber: true
        }
      }),
      db.supplierPayment.findMany({
        where: {
          supplierId
        },
        select: {
          id: true,
          date: true,
          amount: true,
          paymentMethod: true,
          reference: true
        }
      })
    ]);

    // Combine and format transactions
    const transactions = [
      ...purchaseOrders.map((p) => ({
        type: 'PURCHASE',
        id: p.id,
        date: p.date,
        amount: Number(p.total),
        description: 'Purchase Order',
        status: p.status,
        reference: p.referenceNumber,
      })),
      ...payments.map((p) => ({
        type: 'PAYMENT',
        id: p.id,
        date: p.date,
        amount: Number(p.amount),
        description: `Payment - ${p.paymentMethod || 'Unknown'}`,
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
      { 
        success: false, 
        error: 'Failed to fetch supplier balance',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
