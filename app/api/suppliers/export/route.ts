import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const paymentTerms = searchParams.get('paymentTerms');
    const orderSchedule = searchParams.get('orderSchedule');
    const company = searchParams.get('company');
    const hasBalance = searchParams.get('hasBalance') === 'true';

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (paymentTerms && paymentTerms !== 'all') {
      where.paymentTerms = paymentTerms;
    }

    if (orderSchedule) {
      where.orderSchedule = { contains: orderSchedule, mode: 'insensitive' };
    }

    if (company) {
      where.company = { contains: company, mode: 'insensitive' };
    }

    const suppliers = await db.supplier.findMany({
      where,
      include: {
        purchaseOrders: {
          select: {
            total: true,
            status: true
          }
        },
        payments: {
          select: {
            amount: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const mappedSuppliers = suppliers.map((s: any) => {
      const totalPurchases = s.purchaseOrders.reduce((acc: number, po: any) => acc + Number(po.total || 0), 0);
      const totalPayments = s.payments.reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);
      const balance = totalPurchases - totalPayments;

      return {
        ...s,
        totalPurchases,
        totalPayments,
        balance
      };
    });

    const filteredSuppliers = hasBalance 
      ? mappedSuppliers.filter((s: any) => s.balance > 0.01)
      : mappedSuppliers;

    return NextResponse.json({
      success: true,
      data: filteredSuppliers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error exporting suppliers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch suppliers for export' },
      { status: 500 }
    );
  }
}
