import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      dateFilter.lte = endDateObj;
    }

    // Get purchase orders with date filter
    const purchaseOrders = await db.purchaseOrder.groupBy({
      by: ['supplierId'],
      where: Object.keys(dateFilter).length > 0 ? {
        date: dateFilter
      } : {},
      _count: {
        id: true
      },
      _sum: {
        total: true
      },
      _max: {
        date: true
      }
    });

    // Get supplier details
    const supplierIds = purchaseOrders.map(po => po.supplierId);
    const suppliers = await db.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: {
        id: true,
        name: true
      }
    });

    const supplierMap = new Map(suppliers.map(s => [s.id, s]));

    const results = purchaseOrders
      .map(po => {
        const supplier = supplierMap.get(po.supplierId);
        return {
          supplierId: po.supplierId,
          supplierName: supplier?.name,
          totalOrders: po._count.id,
          totalSpent: parseFloat((po._sum.total?.toNumber?.() || 0).toFixed(2)),
          lastPurchaseDate: po._max.date
        };
      })
      .filter(item => {
        if (search) {
          const searchLower = search.toLowerCase();
          return item.supplierName?.toLowerCase().includes(searchLower);
        }
        return true;
      })
      .sort((a, b) => b.totalSpent - a.totalSpent);

    return NextResponse.json({
      success: true,
      data: results.map((row: any) => ({
        ...row,
        totalSpent: parseFloat(row.totalSpent || '0'),
        totalOrders: parseInt(row.totalOrders || '0'),
      }))
    });

  } catch (error) {
    console.error('Error fetching Purchases by Supplier report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch report data' },
      { status: 500 }
    );
  }
}
