import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getNextXReadingNumber } from '@/lib/db-helpers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const cashierId = searchParams.get('cashierId');
    const shiftStatus = searchParams.get('shiftStatus');
    const limit = searchParams.get('limit');
    const shiftId = searchParams.get('shiftId');
    
    const where: any = {};
    if (startDate) {
        where.startTime = { ...where.startTime, gte: new Date(startDate) };
    }
    if (endDate) {
        where.startTime = { ...where.startTime, lte: new Date(endDate) };
    }
    if (cashierId && cashierId !== 'all') {
        where.userId = cashierId;
    }
    if (shiftStatus && shiftStatus !== 'all') {
        where.status = shiftStatus;
    }
    if (shiftId) {
        where.id = shiftId;
    }

    const shifts = await db.shift.findMany({
        where,
        orderBy: { startTime: 'desc' },
        take: limit ? parseInt(limit) : undefined,
        include: {
            user: true,
            terminal: true,
        }
    });

    // For each shift, we also need breakdown of payments
    const formattedReadings = await Promise.all(shifts.map(async (shift) => {
        // Fetch aggregations for this shift
        const aggregations = await db.posTransaction.groupBy({
            by: ['transactionType'],
            where: { shiftId: shift.id, isTraining: false },
            _sum: {
                totalAmount: true,
                subtotal: true,
                taxAmount: true,
                discountAmount: true,
            },
            _count: {
                id: true
            }
        });

        // Fetch payment method breakdown
        const paymentBreakdown = await db.posTransaction.groupBy({
            by: ['paymentMethod'],
            where: { shiftId: shift.id, isTraining: false, transactionType: 'sale' },
            _sum: {
                totalAmount: true
            }
        });

        // Fetch min/max receipt numbers for sales
        // Receipt numbers are on SalesTransaction. 
        // We can join or fetch separately.
        const saleTransactions = await db.posTransaction.findMany({
            where: { shiftId: shift.id, isTraining: false, transactionType: 'sale' },
            include: {
                sale: {
                    select: {
                        receiptNumber: true
                    }
                }
            },
            orderBy: {
                sale: {
                    receiptNumber: 'asc'
                }
            }
        });

        let grossSales = 0;
        let netSales = 0;
        let vatAmount = 0;
        let discounts = 0;
        let transactionCount = 0;
        let returnsAmount = 0;
        let voidAmount = 0;
        let refundAmount = 0;
        let cashSales = 0;

        aggregations.forEach(agg => {
            const sum = agg._sum;
            const count = agg._count.id;
            
            if (agg.transactionType === 'sale') {
                grossSales = Number(sum.subtotal || 0);
                netSales = Number(sum.totalAmount || 0);
                vatAmount = Number(sum.taxAmount || 0);
                discounts = Number(sum.discountAmount || 0);
                transactionCount = count;
            } else if (agg.transactionType === 'return') {
                returnsAmount = Number(sum.totalAmount || 0);
            } else if (agg.transactionType === 'void') {
                voidAmount = Number(sum.totalAmount || 0);
            } else if (agg.transactionType === 'refund') {
                refundAmount = Number(sum.totalAmount || 0);
            }
        });

        const paymentMethods = paymentBreakdown.map(pb => {
            const amount = Number(pb._sum.totalAmount || 0);
            if (pb.paymentMethod === 'CASH') {
                cashSales = amount;
            }
            return {
                name: pb.paymentMethod || 'Unknown',
                amount
            };
        });

        let minSaleId = '000000';
        let maxSaleId = '000000';

        if (saleTransactions.length > 0) {
            const validReceipts = saleTransactions
                .map(st => st.sale?.receiptNumber)
                .filter(Boolean) as string[];
            
            if (validReceipts.length > 0) {
                minSaleId = validReceipts[0];
                maxSaleId = validReceipts[validReceipts.length - 1];
            }
        }

        const startingCash = Number(shift.startingCash || 0);
        const actualCash = Number(shift.actualCash || 0);
        const cashInDrawer = startingCash + cashSales;
        const overShort = actualCash - cashInDrawer;

      return {
        id: shift.id,
        date: shift.startTime,
        reportDate: shift.startTime,
        shiftStart: shift.startTime,
        shiftEnd: shift.endTime,
        grossSales,
        returns: returnsAmount,
        discounts,
        netSales,
        vatAmount,
        paymentMethods,
        transactionCount,
        startingCash,
        cashSales,
        cashInDrawer,
        cashierName: shift.user?.displayName || shift.user?.username || 'Unknown',
        cashierId: shift.userId,
        terminalId: shift.terminalId || 'Counter 1',
        shiftStatus: shift.status,
        
        // Cash Count Fields for Layout
        cashCountId: shift.id.substring(0, 8).toUpperCase(),
        cashCountTotal: actualCash,
        cashDeposit: 0,
        cashPickup: 0,
        overShort: overShort,
        cashDenominations: typeof shift.cashDenominations === 'string' 
            ? JSON.parse(shift.cashDenominations) 
            : shift.cashDenominations || [],

        // New Layout Fields
        minSaleId: String(minSaleId).padStart(6, '0'),
        maxSaleId: String(maxSaleId).padStart(6, '0'),
        voidAmount,
        refundAmount,
        min: shift.terminal?.terminalMin || '',
        sn: shift.terminal?.serialNumber || shift.terminal?.terminalSerialNumber || '',
      };
    }));

    return NextResponse.json({
      success: true,
      data: formattedReadings,
    });
  } catch (error) {
    console.error('Error fetching X-readings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch X-readings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      reportDate,
      shiftStart,
      shiftEnd,
      terminalId,
      cashierName,
      cashierId,
      grossSales,
      returns,
      discounts,
      netSales,
      vatAmount,
      paymentMethods,
      transactionCount,
      startingCash,
      cashSales,
      cashInDrawer,
      shiftStatus = 'active',
    } = body;

    if (!terminalId) {
        return NextResponse.json({ success: false, error: 'Terminal ID is required' }, { status: 400 });
    }

    // Generate Reading Number server-side
    const readingNumber = await getNextXReadingNumber(terminalId);

    const result = await db.xReading.create({
      data: {
        readingNumber,
        reportDate: reportDate ? new Date(reportDate) : new Date(),
        shiftStart: shiftStart ? new Date(shiftStart) : null,
        shiftEnd: shiftEnd ? new Date(shiftEnd) : null,
        terminalId,
        cashierName,
        cashierId,
        grossSales: grossSales || 0,
        returns: returns || 0,
        discounts: discounts || 0,
        netSales: netSales || 0,
        vatAmount: vatAmount || 0,
        paymentMethods: paymentMethods ? paymentMethods : [],
        transactionCount: transactionCount || 0,
        startingCash: startingCash || 0,
        cashSales: cashSales || 0,
        cashInDrawer: cashInDrawer || 0,
        shiftStatus,
      }
    });

    return NextResponse.json({
      success: true,
      data: { id: result.id, readingNumber },
    });
  } catch (error) {
    console.error('Error creating X-reading:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create X-reading',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
