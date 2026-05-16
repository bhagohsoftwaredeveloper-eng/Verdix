import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { BadOrderStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const excludedStatuses: BadOrderStatus[] = ['Resolved', 'Replaced', 'Credited'];

    // 1. Total Open Cases (Not Resolved, Replaced, or Credited)
    const totalOpenCases = await db.badOrder.count({
      where: {
        status: {
          notIn: excludedStatuses,
        },
      },
    });

    // 2. Total Value at Risk (Sum of totalAffectedValue for open cases)
    const valueAtRiskResult = await db.badOrder.aggregate({
      where: {
        status: {
          notIn: excludedStatuses,
        },
      },
      _sum: {
        totalAffectedValue: true,
      },
    });
    const totalValueAtRisk = Number(valueAtRiskResult._sum.totalAffectedValue || 0);

    // 3. Action Required (Reported or Return Requested)
    const actionRequired = await db.badOrder.count({
      where: {
        status: {
          in: ['Reported', 'ReturnRequested'],
        },
      },
    });

    // 4. Top Suppliers with Issues (High Risk)
    const topSuppliersResult = await db.badOrder.groupBy({
      by: ['supplierId', 'supplierName'],
      where: {
        status: {
          notIn: excludedStatuses,
        },
      },
      _count: {
        _all: true,
      },
      _sum: {
        totalAffectedValue: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    });
    
    const topSuppliers = topSuppliersResult.map((row) => ({
      supplierId: row.supplierId,
      supplierName: row.supplierName,
      openCount: row._count._all,
      totalValue: Number(row._sum.totalAffectedValue || 0),
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalOpenCases,
        totalValueAtRisk,
        actionRequired,
        topSuppliers,
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching bad order stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bad order stats' },
      { status: 500 }
    );
  }
}
