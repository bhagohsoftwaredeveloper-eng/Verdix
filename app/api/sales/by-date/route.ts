import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const terminalId = searchParams.get('terminalId');
    const interval = searchParams.get('interval') || 'daily'; // daily, hourly, monthly
    const paymentType = searchParams.get('paymentType');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions: Prisma.PosTransactionWhereInput = {
      transactionType: 'sale',
      paymentStatus: 'completed',
    };

    if (terminalId && terminalId !== 'all') {
      whereConditions.terminalId = terminalId;
    }

    if (paymentType && paymentType !== 'all') {
      whereConditions.paymentMethod = paymentType;
    }

    if (startDate) {
      whereConditions.transactionTime = {
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      if (whereConditions.transactionTime) {
        whereConditions.transactionTime.lte = new Date(endDate);
      } else {
        whereConditions.transactionTime = {
          lte: new Date(endDate),
        };
      }
    }

    // Fetch raw data for aggregation using $queryRaw
    const getDateBucket = (interval: string): string => {
      switch (interval) {
        case 'hourly':
          return "DATE_TRUNC('hour', pt.transaction_time)";
        case 'monthly':
          return "DATE_TRUNC('month', pt.transaction_time)";
        case 'daily':
        default:
          return "DATE(pt.transaction_time)";
      }
    };

    const dateBucket = getDateBucket(interval);

    // Use raw query for complex aggregation
    const rawResults = await db.$queryRaw<any[]>`
      SELECT
        ${Prisma.raw(dateBucket)} as date,
        COUNT(DISTINCT pt.id) as transaction_count,
        MIN(pt.order_number) as start_or,
        MAX(pt.order_number) as end_or,
        SUM(pt.total_amount) as total_revenue,
        SUM(pt.discount_amount) as total_discount,
        SUM(pt.tax_amount) as total_tax,
        COALESCE(SUM(p.cost * pti.quantity), 0) as total_cost
      FROM pos_transactions pt
      LEFT JOIN pos_transaction_items pti ON pt.id = pti.pos_transaction_id
      LEFT JOIN products p ON pti.product_id = p.id
      WHERE pt.transaction_type = 'sale'
        AND pt.payment_status = 'completed'
        ${terminalId && terminalId !== 'all' ? Prisma.sql`AND pt.terminal_id = ${terminalId}` : Prisma.empty}
        ${paymentType && paymentType !== 'all' ? Prisma.sql`AND pt.payment_method = ${paymentType}` : Prisma.empty}
        ${startDate ? Prisma.sql`AND pt.transaction_time >= ${new Date(startDate)}` : Prisma.empty}
        ${endDate ? Prisma.sql`AND pt.transaction_time <= ${new Date(endDate)}` : Prisma.empty}
      GROUP BY 1
      ORDER BY date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Get total count for pagination
    const countResult = await db.$queryRaw<any[]>`
      SELECT COUNT(DISTINCT ${Prisma.raw(dateBucket)}) as total
      FROM pos_transactions pt
      WHERE pt.transaction_type = 'sale'
        AND pt.payment_status = 'completed'
        ${terminalId && terminalId !== 'all' ? Prisma.sql`AND pt.terminal_id = ${terminalId}` : Prisma.empty}
        ${paymentType && paymentType !== 'all' ? Prisma.sql`AND pt.payment_method = ${paymentType}` : Prisma.empty}
        ${startDate ? Prisma.sql`AND pt.transaction_time >= ${new Date(startDate)}` : Prisma.empty}
        ${endDate ? Prisma.sql`AND pt.transaction_time <= ${new Date(endDate)}` : Prisma.empty}
    `;

    const totalCount = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalCount / limit);

    const formattedData = rawResults.map((row: any) => {
      const totalRevenue = parseFloat(row.total_revenue) || 0;
      const totalTax = parseFloat(row.total_tax) || 0;
      const totalCost = parseFloat(row.total_cost) || 0;
      const totalDiscount = parseFloat(row.total_discount) || 0;

      const vatableSales = totalRevenue - totalTax;
      const profit = totalRevenue - totalCost - totalTax;

      return {
        date: row.date instanceof Date ? row.date.toISOString() : row.date,
        transactionCount: parseInt(row.transaction_count),
        startOR: row.start_or,
        endOR: row.end_or,
        totalRevenue,
        totalDiscount,
        vatableSales,
        vatAmount: totalTax,
        vatExemptSales: 0,
        zeroRatedSales: 0,
        nonVatSales: 0,
        cost: totalCost,
        profit
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedData,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error fetching sales by date:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales by date data' },
      { status: 500 }
    );
  }
}
