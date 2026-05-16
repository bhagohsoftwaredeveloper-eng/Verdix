import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';

const safeNum = (val: any): number => {
    if (val === null || val === undefined) return 0;
    return Number(val);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const terminalId = searchParams.get('terminalId');
    
    if (!terminalId) {
        return NextResponse.json({ success: false, error: 'Terminal ID is required' }, { status: 400 });
    }

    const isAllTerminals = terminalId === 'all';
    const shiftId = searchParams.get('shiftId');

    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    let start: Date;
    let end: Date;

    if (shiftId) {
        const shift = await db.shift.findUnique({ where: { id: shiftId } });
        if (!shift) return NextResponse.json({ success: false, error: 'Shift not found' }, { status: 404 });
        start = shift.startTime;
        end = shift.endTime || new Date();
    } else {
        start = startDateParam ? startOfDay(parseISO(startDateParam)) : startOfDay(new Date());
        end = endDateParam ? endOfDay(parseISO(endDateParam)) : endOfDay(new Date());
    }

    const commonWhere: any = {
        isTraining: false,
        posTransaction: {
            terminalId: isAllTerminals ? undefined : terminalId,
            shiftId: shiftId || undefined,
            transactionTime: {
                gte: start,
                lte: end
            }
        }
    };

    // ── 1. Overall totals ────────────────────
    const completedSalesWhere = {
        ...commonWhere,
        status: { notIn: ['Void', 'Voided', 'Cancelled', 'Returned'] }
    };

    const overallTotals = await db.salesTransaction.aggregate({
        where: completedSalesWhere,
        _sum: {
            total: true
        },
        _count: {
            id: true
        }
    });

    const completedDiscounts = await db.posTransaction.aggregate({
        where: {
            shiftId: shiftId || undefined,
            terminalId: isAllTerminals ? undefined : terminalId,
            transactionTime: { gte: start, lte: end },
            isTraining: false,
            sale: { status: { notIn: ['Void', 'Voided', 'Cancelled', 'Returned'] } }
        },
        _sum: {
            discountAmount: true
        }
    });

    // ── 2. Terminal breakdown ─────────────────────────────────────────────────
    const terminalBreakdown = await db.posTransaction.groupBy({
        by: ['terminalId'],
        where: {
            shiftId: shiftId || undefined,
            terminalId: isAllTerminals ? undefined : terminalId,
            transactionTime: { gte: start, lte: end },
            isTraining: false,
            sale: { status: { notIn: ['Void', 'Voided', 'Cancelled', 'Returned'] } }
        },
        _sum: {
            totalAmount: true
        },
        _count: {
            id: true
        }
    });

    const terminalIds = terminalBreakdown.map(t => t.terminalId).filter(Boolean) as string[];
    const terminalsList = await db.posTerminal.findMany({
        where: { id: { in: terminalIds } }
    });

    const terminalResults = terminalBreakdown.map(tb => {
        const terminal = terminalsList.find(t => t.id === tb.terminalId);
        return {
            terminal_id: tb.terminalId,
            terminal_name: terminal?.name || tb.terminalId,
            net_sales: tb._sum.totalAmount,
            transaction_count: tb._count.id
        };
    });

    // ── 3. Cashier breakdown ──────────────────────────────────────────────────
    const cashierBreakdown = await db.posTransaction.groupBy({
        by: ['userId'],
        where: {
            shiftId: shiftId || undefined,
            terminalId: isAllTerminals ? undefined : terminalId,
            transactionTime: { gte: start, lte: end },
            isTraining: false,
            sale: { status: { notIn: ['Void', 'Voided', 'Cancelled', 'Returned'] } }
        },
        _sum: {
            totalAmount: true
        },
        _count: {
            id: true
        }
    });

    const userIds = cashierBreakdown.map(c => c.userId);
    const usersList = await db.user.findMany({
        where: { uid: { in: userIds } }
    });

    const cashiers = cashierBreakdown.map(cb => {
        const user = usersList.find(u => u.uid === cb.userId);
        return {
            cashier_name: user?.displayName || 'Unknown',
            cashier_id: cb.userId,
            net_sales: cb._sum.totalAmount,
            transaction_count: cb._count.id
        };
    });

    // ── 4. Payment method breakdown ───────────────────────────────────────────
    const paymentResults = await db.salesTransaction.groupBy({
        by: ['paymentMethod'],
        where: completedSalesWhere,
        _sum: {
            total: true
        }
    });

    // ── 5. Discount summary ───────────────────────────────────────────────────
    const discountSummaryResults = await db.posTransactionItem.groupBy({
        by: ['discountType'],
        where: {
            posTransaction: {
                shiftId: shiftId || undefined,
                terminalId: isAllTerminals ? undefined : terminalId,
                transactionTime: { gte: start, lte: end },
                isTraining: false,
                sale: { status: { notIn: ['Void', 'Voided', 'Cancelled', 'Returned'] } }
            },
            discountAmount: { gt: 0 }
        },
        _sum: {
            discountAmount: true
        },
        _count: {
            id: true,
            posTransactionId: true
        }
    });

    // ── 6. VAT breakdown ──────────────────────────────────────────────────────
    const vatAdjustmentResults = await db.posTransactionItem.groupBy({
        by: ['taxType'],
        where: {
            posTransaction: {
                shiftId: shiftId || undefined,
                terminalId: isAllTerminals ? undefined : terminalId,
                transactionTime: { gte: start, lte: end },
                isTraining: false,
                sale: { status: { notIn: ['Void', 'Voided', 'Cancelled', 'Returned'] } }
            }
        },
        _sum: {
            lineTotal: true
        }
    });

    // ── 7. Returns & Voids ────────────────────────────────────────────────────
    const returnsResult = await db.salesTransaction.aggregate({
        where: {
            ...commonWhere,
            status: 'Returned'
        },
        _sum: { total: true },
        _count: { id: true }
    });

    const voidResult = await db.salesTransaction.aggregate({
        where: {
            ...commonWhere,
            status: { in: ['Void', 'Voided', 'Cancelled'] }
        },
        _sum: { total: true },
        _count: { id: true }
    });

    // ── 8. Starting cash ───────────────────────────
    let shiftData: any;
    if (!isAllTerminals && !shiftId) {
        // Latest shift for the terminal
        shiftData = await db.shift.findFirst({
            where: {
                terminalId: terminalId,
                startTime: { gte: start, lte: end }
            },
            orderBy: { startTime: 'desc' }
        });
    } else if (shiftId) {
        shiftData = await db.shift.findUnique({ where: { id: shiftId } });
    } else {
        const aggregatedShifts = await db.shift.aggregate({
            where: {
                startTime: { gte: start, lte: end }
            },
            _sum: {
                startingCash: true,
                actualCash: true,
                cashDifference: true
            }
        });
        shiftData = {
            startingCash: aggregatedShifts._sum.startingCash,
            actualCash: aggregatedShifts._sum.actualCash,
            cashDifference: aggregatedShifts._sum.cashDifference
        };
    }

    const startingCash = safeNum(shiftData?.startingCash);
    const actualCash   = safeNum(shiftData?.actualCash);
    const cashVariance = safeNum(shiftData?.cashDifference);

    // ── 9. Business settings & terminal info ─────────────────────────────────
    const settingsResult = await db.posSettings.findFirst();
    let headerTerminalInfo = { min: '', sn: '' };
    if (!isAllTerminals) {
        const termResult = await db.posTerminal.findUnique({ where: { id: terminalId } });
        headerTerminalInfo = {
            min: termResult?.terminalMin || '',
            sn: termResult?.terminalSerialNumber || ''
        };
    }

    // ── Computations ──────────────────────────────────────────────────────────
    const netSales           = safeNum(overallTotals?._sum?.total);
    const completedDiscountsVal = safeNum(completedDiscounts?._sum?.discountAmount);
    const totalReturns       = safeNum(returnsResult?._sum?.total);
    const totalVoid          = safeNum(voidResult?._sum?.total);
    
    const grossSales         = netSales + completedDiscountsVal + totalReturns + totalVoid;

    const vatRow = vatAdjustmentResults.find((v: any) => (v.taxType || 'VAT') === 'VAT');
    const vatTotalAmount = safeNum(vatRow?._sum?.lineTotal);
    const vatAmount      = vatTotalAmount - (vatTotalAmount / 1.12);
    const vatSales       = vatTotalAmount - vatAmount;

    const vatExemptSales = safeNum(
        vatAdjustmentResults.find((v: any) => v.taxType === 'VAT_EXEMPT')?._sum?.lineTotal
    );
    const zeroRatedSales = safeNum(
        vatAdjustmentResults.find((v: any) => v.taxType === 'ZERO_RATED')?._sum?.lineTotal
    );
    const nonVatSales = safeNum(
        vatAdjustmentResults.find((v: any) => v.taxType === 'NON_VAT')?._sum?.lineTotal
    );

    const cashSalesObj = paymentResults.find((p: any) => p.paymentMethod?.toUpperCase() === 'CASH');
    const cashSales    = safeNum(cashSalesObj?._sum?.total);
    const cashInDrawer = startingCash + cashSales;

    const data = {
        terminalId: isAllTerminals ? 'ALL TERMINALS' : terminalId,
        startDate: format(start, 'yyyy-MM-dd HH:mm:ss'),
        endDate: format(end, 'yyyy-MM-dd HH:mm:ss'),
        grossSales,
        netSales,
        totalDiscounts: completedDiscountsVal,
        transactionCount: safeNum(overallTotals?._count?.id),
        vatSales,
        vatAmount,
        vatExempt: vatExemptSales,
        zeroRated: zeroRatedSales,
        nonVat: nonVatSales,
        voidAmount: totalVoid,
        voidCount: safeNum(voidResult?._count?.id),
        returnAmount: totalReturns,
        returnCount: safeNum(returnsResult?._count?.id),
        vatAdjustment: 0,
        startingCash,
        cashSales,
        cashInDrawer,
        actualCash,
        variance: cashVariance,
        paymentMethods: paymentResults.map((p: any) => ({
            name: p.paymentMethod || 'Unknown',
            amount: safeNum(p._sum.total)
        })),
        discountSummary: [
            ...discountSummaryResults.map((d: any) => ({
                type: d.discountType,
                amount: safeNum(d._sum.discountAmount),
                count: safeNum(d._count.posTransactionId),
                itemCount: safeNum(d._count.id)
            }))
        ],
        salesAdjustment: {
            void:   { count: safeNum(voidResult?._count?.id),    amount: totalVoid },
            return: { count: safeNum(returnsResult?._count?.id), amount: totalReturns }
        },
        terminals: terminalResults.map((t: any) => ({
            terminalId:       t.terminal_id,
            terminalName:     t.terminal_name,
            netSales:         safeNum(t.net_sales),
            transactionCount: safeNum(t.transaction_count)
        })),
        cashiers: cashiers.map((c: any) => ({
            cashierName:      c.cashier_name,
            cashierId:        c.cashier_id,
            netSales:         safeNum(c.net_sales),
            transactionCount: safeNum(c.transaction_count)
        })),
        businessSettings: {
            businessName:  settingsResult?.businessName || 'Business Name',
            address:       settingsResult?.address || '',
            tin:           settingsResult?.tin || '',
            contactNumber: settingsResult?.contactNumber || ''
        },
        terminalInfo: headerTerminalInfo
    };

    return NextResponse.json({ 
      success: true, 
      data,
      debug: {
        startDate: format(start, 'yyyy-MM-dd HH:mm:ss'),
        endDate: format(end, 'yyyy-MM-dd HH:mm:ss'),
        terminalId: terminalId || 'all'
      }
    });

  } catch (error: any) {
    console.error('Error fetching overall reading:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch overall reading', details: error.message }, { status: 500 });
  }
}
