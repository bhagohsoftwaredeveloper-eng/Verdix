import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getNextZReadingNumber, withTransaction } from '@/lib/db-helpers';
import { format } from 'date-fns';

const safeParseFloat = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
}

const safeInt = (val: any): number => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'bigint') return Number(val);
    return parseInt(val);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');
    let startDate = searchParams.get('startDate');
    let endDate = searchParams.get('endDate');
    let terminalId = searchParams.get('terminalId') || 'all';

    const settings = await db.posSetting.findFirst({
      select: { businessName: true, address: true }
    });
    const businessName = settings?.businessName || 'Business Name';
    const businessAddress = settings?.address || '';

    if (mode === 'current') {
        const lastZ = await db.zReading.findFirst({
            where: terminalId && terminalId !== 'all' ? { terminalId } : {},
            orderBy: { reportDate: 'desc' },
            select: { reportDate: true }
        });

        startDate = lastZ?.reportDate
            ? format(new Date(lastZ.reportDate), 'yyyy-MM-dd HH:mm:ss')
            : null;

        endDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss');

        // Build filter conditions
        const whereFilter: any = {
            status: { notIn: ['Void', 'Voided', 'Cancelled', 'Returned'] },
            posTransaction: {
                isTraining: false
            }
        };

        if (startDate) {
            whereFilter.createdAt = { ...whereFilter.createdAt, gt: new Date(startDate) };
        }
        if (endDate) {
            whereFilter.createdAt = { ...whereFilter.createdAt, lte: new Date(endDate) };
        }
        if (terminalId && terminalId !== 'all') {
            whereFilter.posTransaction.terminalId = terminalId;
        }

        // Get sales data
        const salesData = await db.saleTransaction.findMany({
            where: whereFilter,
            select: {
                total: true,
                receiptNumber: true,
                posTransaction: {
                    select: { discountAmount: true }
                }
            }
        });

        const grossSales = salesData.reduce((sum, s) => sum + Number(s.total), 0);
        const totalDiscounts = salesData.reduce((sum, s) => sum + Number(s.posTransaction?.discountAmount || 0), 0);
        const minSaleId = salesData.length > 0 ? Math.min(...salesData.map(s => parseInt(s.receiptNumber || '0'))) : 0;
        const maxSaleId = salesData.length > 0 ? Math.max(...salesData.map(s => parseInt(s.receiptNumber || '0'))) : 0;

        // Get returns
        const returnsData = await db.saleTransaction.aggregate({
            where: {
                status: 'Returned',
                posTransaction: {
                    isTraining: false,
                    createdAt: {
                        ...(startDate && { gt: new Date(startDate) }),
                        ...(endDate && { lte: new Date(endDate) })
                    },
                    ...(terminalId && terminalId !== 'all' && { terminalId })
                }
            },
            _sum: { total: true }
        });
        const totalReturns = Number(returnsData._sum?.total || 0);

        // Get voids
        const voidData = await db.saleTransaction.findMany({
            where: {
                status: { in: ['Void', 'Voided', 'Cancelled'] },
                posTransaction: {
                    isTraining: false,
                    createdAt: {
                        ...(startDate && { gt: new Date(startDate) }),
                        ...(endDate && { lte: new Date(endDate) })
                    },
                    ...(terminalId && terminalId !== 'all' && { terminalId })
                }
            },
            select: {
                total: true,
                receiptNumber: true
            }
        });
        const voidAmount = voidData.reduce((sum, v) => sum + Number(v.total), 0);
        const minVoidId = voidData.length > 0 ? Math.min(...voidData.map(v => parseInt(v.receiptNumber || '0'))) : 0;
        const maxVoidId = voidData.length > 0 ? Math.max(...voidData.map(v => parseInt(v.receiptNumber || '0'))) : 0;

        // Get returns (receipt numbers from pos_transactions)
        const returnSeqData = await db.posTransaction.findMany({
            where: {
                transactionType: 'return',
                isTraining: false,
                createdAt: {
                    ...(startDate && { gt: new Date(startDate) }),
                    ...(endDate && { lte: new Date(endDate) })
                },
                ...(terminalId && terminalId !== 'all' && { terminalId })
            },
            select: { id: true }
        });
        const minReturnId = returnSeqData.length > 0 ? Math.min(...returnSeqData.map(r => parseInt(String(r.id).slice(-6)))) : 0;
        const maxReturnId = returnSeqData.length > 0 ? Math.max(...returnSeqData.map(r => parseInt(String(r.id).slice(-6)))) : 0;

        // Get payment methods
        const paymentData = await db.saleTransaction.findMany({
            where: {
                status: { notIn: ['Void', 'Voided', 'Cancelled', 'Returned'] },
                posTransaction: {
                    isTraining: false,
                    createdAt: {
                        ...(startDate && { gt: new Date(startDate) }),
                        ...(endDate && { lte: new Date(endDate) })
                    },
                    ...(terminalId && terminalId !== 'all' && { terminalId })
                }
            },
            select: {
                paymentMethod: true,
                total: true
            },
            distinct: ['paymentMethod']
        });

        const paymentsByMethod = new Map<string, number>();
        for (const payment of paymentData) {
            const method = payment.paymentMethod || 'Unknown';
            paymentsByMethod.set(method, (paymentsByMethod.get(method) || 0) + Number(payment.total));
        }
        
        // Get discount summary
        const discountItems = await db.posTransactionItem.findMany({
            where: {
                discountAmount: { gt: 0 },
                posTransaction: {
                    isTraining: false,
                    saleTransaction: {
                        status: { notIn: ['Void', 'Voided', 'Cancelled', 'Returned'] }
                    },
                    createdAt: {
                        ...(startDate && { gt: new Date(startDate) }),
                        ...(endDate && { lte: new Date(endDate) })
                    },
                    ...(terminalId && terminalId !== 'all' && { terminalId })
                }
            },
            select: {
                discountType: true,
                discountAmount: true,
                posTransactionId: true,
                posTransaction: { select: { id: true } }
            }
        });

        const discountSummaryMap = new Map<string, { amount: number; txnCount: number; itemCount: number }>();
        const uniqueTxns = new Set<string>();
        for (const item of discountItems) {
            const type = item.discountType || 'percent';
            const existing = discountSummaryMap.get(type) || { amount: 0, txnCount: 0, itemCount: 0 };
            existing.amount += Number(item.discountAmount);
            existing.itemCount += 1;
            uniqueTxns.add(String(item.posTransactionId));
            discountSummaryMap.set(type, existing);
        }
        discountSummaryMap.forEach(v => { v.txnCount = uniqueTxns.size; });

        // Get VAT adjustment
        const vatItems = await db.posTransactionItem.findMany({
            where: {
                posTransaction: {
                    isTraining: false,
                    saleTransaction: {
                        status: { notIn: ['Void', 'Voided', 'Cancelled', 'Returned'] }
                    },
                    createdAt: {
                        ...(startDate && { gt: new Date(startDate) }),
                        ...(endDate && { lte: new Date(endDate) })
                    },
                    ...(terminalId && terminalId !== 'all' && { terminalId })
                }
            },
            select: {
                taxType: true,
                lineTotal: true
            }
        });

        const vatSummaryMap = new Map<string, { totalAmount: number; vatAmount: number }>();
        for (const item of vatItems) {
            const type = item.taxType || 'VAT';
            const lineTotal = Number(item.lineTotal);
            const existing = vatSummaryMap.get(type) || { totalAmount: 0, vatAmount: 0 };
            existing.totalAmount += lineTotal;
            if (type === 'VAT') {
                existing.vatAmount += lineTotal - (lineTotal / 1.12);
            }
            vatSummaryMap.set(type, existing);
        }

        // Get shift data
        const shiftData = await db.shift.findMany({
            where: {
                startTime: {
                    ...(startDate && { gt: new Date(startDate) }),
                    lte: new Date(endDate)
                },
                ...(terminalId && terminalId !== 'all' && { terminalId })
            },
            select: {
                startingCash: true,
                actualCash: true,
                cashDifference: true
            }
        });

        const totalStartingCash = shiftData.reduce((sum, s) => sum + Number(s.startingCash), 0);
        const totalActualCash = shiftData.reduce((sum, s) => sum + Number(s.actualCash), 0);
        const totalCashDifference = shiftData.reduce((sum, s) => sum + Number(s.cashDifference), 0);

        // Get previous reading total
        const prevReadings = await db.zReading.findMany({
            where: {
                reportDate: { lte: startDate ? new Date(startDate) : new Date('2000-01-01') },
                ...(terminalId && terminalId !== 'all' && { terminalId })
            },
            select: { netSales: true }
        });
        const previousReading = prevReadings.reduce((sum, z) => sum + Number(z.netSales), 0);

        const rawNetSales = grossSales;
        const discounts = totalDiscounts;
        const returns = totalReturns;

        const adjustedGrossSales = rawNetSales + discounts + returns + voidAmount;
        const finalNetSales = rawNetSales;
        const vatVAT = vatSummaryMap.get('VAT');
        const vatTotalAmount = vatVAT?.totalAmount || 0;
        const vatAmount = vatVAT?.vatAmount || 0;
        const vatableSales = vatTotalAmount - vatAmount;
        const startingCash = totalStartingCash;
        const actualCash = totalActualCash;
        const cashVariance = totalCashDifference;

        const cashSales = paymentsByMethod.get('CASH') || 0;
        const cashInDrawer = startingCash + cashSales;
        const runningTotal = previousReading + finalNetSales;

        const paymentMethods = Array.from(paymentsByMethod.entries()).map(([name, amount]) => ({
            name,
            amount
        }));

        // Get terminal data
        let terminalMin = '';
        let terminalSn = '';
        let terminalZCounter = 0;
        let terminalResetCounter = 0;

        if (terminalId && terminalId !== 'all') {
            const term = await db.posTerminal.findUnique({
                where: { id: terminalId },
                select: {
                    terminalMin: true,
                    terminalSerialNumber: true,
                    zCounter: true,
                    resetCounter: true
                }
            });
            if (term) {
                terminalMin = term.terminalMin || '';
                terminalSn = term.terminalSerialNumber || '';
                terminalZCounter = safeInt(term.zCounter);
                terminalResetCounter = safeInt(term.resetCounter);
            }
        }

        const vatExemptSales = vatSummaryMap.get('VAT_EXEMPT')?.totalAmount || 0;
        const zeroRatedSales = vatSummaryMap.get('ZERO_RATED')?.totalAmount || 0;
        const nonVatSales = vatSummaryMap.get('NON_VAT')?.totalAmount || 0;
        const vatAdjustmentAmount = Array.from(vatSummaryMap.entries())
            .filter(([type]) => type !== 'VAT')
            .reduce((acc, [, data]) => acc + (data.vatAmount || 0), 0);

        const discountSummary = Array.from(discountSummaryMap.entries()).map(([type, data]) => ({
            type,
            amount: data.amount,
            count: data.txnCount,
            itemCount: data.itemCount
        }));

        const generatedReading = {
            id: `PREVIEW`,
            date: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
            reportDate: new Date(),
            businessName,
            address: businessAddress,
            grossSales: safeParseFloat(adjustedGrossSales),
            returns: safeParseFloat(returns),
            discounts: safeParseFloat(discounts),
            netSales: safeParseFloat(finalNetSales),
            vatSales: safeParseFloat(vatableSales),
            vatAmount: safeParseFloat(vatAmount),
            vatExempt: safeParseFloat(vatExemptSales),
            zeroRated: safeParseFloat(zeroRatedSales),
            nonVat: safeParseFloat(nonVatSales),
            paymentMethods: paymentMethods.map((pm) => ({
                name: String(pm.name),
                amount: safeParseFloat(pm.amount)
            })),
            transactionCount: salesData.length,
            startingCash: safeParseFloat(startingCash),
            cashSales: safeParseFloat(cashSales),
            cashInDrawer: safeParseFloat(cashInDrawer),
            cashierName: 'Admin',
            terminalId: terminalId,
            terminalMin: terminalMin || '',
            terminalSerialNumber: terminalSn || '',
            minSaleId: String(minSaleId).padStart(6, '0'),
            maxSaleId: String(maxSaleId).padStart(6, '0'),
            minVoidId: String(minVoidId).padStart(6, '0'),
            maxVoidId: String(maxVoidId).padStart(6, '0'),
            minReturnId: String(minReturnId).padStart(6, '0'),
            maxReturnId: String(maxReturnId).padStart(6, '0'),
            previousReading: safeParseFloat(previousReading),
            runningTotal: safeParseFloat(runningTotal),
            voidAmount: safeParseFloat(voidAmount),
            vatAdjustment: safeParseFloat(vatAdjustmentAmount),
            discountSummary,
            salesAdjustment: {
                void: {
                    count: voidData.length,
                    amount: voidAmount
                },
                return: {
                    count: returnSeqData.length,
                    amount: returns
                }
            },
            zCounter: terminalZCounter + 1,
            resetCounter: terminalResetCounter,
            actualCash,
            variance: cashVariance,
            intervalStartDate: startDate
        };

        
        return NextResponse.json({ success: true, data: [generatedReading] });

    } else {
        // Fetch existing Z-readings
        const queryWhere: any = {};

        if (startDate) {
            queryWhere.reportDate = { ...queryWhere.reportDate, gte: new Date(`${startDate} 00:00:00`) };
        }
        if (endDate) {
            queryWhere.reportDate = { ...queryWhere.reportDate, lte: new Date(`${endDate} 23:59:59`) };
        }
        if (terminalId && terminalId !== 'all') {
            queryWhere.terminalId = terminalId;
        }

        const readings = await db.zReading.findMany({
            where: queryWhere,
            orderBy: { reportDate: 'desc' },
            include: {
                posTerminal: {
                    select: {
                        terminalMin: true,
                        terminalSerialNumber: true
                    }
                }
            }
        });

        const mappedResults = readings.map((row) => {
            let paymentMethods = [];
            try {
                const parsed = typeof row.paymentMethods === 'string' ? JSON.parse(row.paymentMethods) : row.paymentMethods;
                paymentMethods = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                paymentMethods = [];
            }

            let discountSummary = [];
            try {
                const parsed = typeof row.discountSummary === 'string' ? JSON.parse(row.discountSummary) : row.discountSummary;
                discountSummary = Array.isArray(parsed) ? parsed : [];
            } catch (e) { }

            let salesAdjustment: any = { void: { count: 0, amount: 0 }, return: { count: 0, amount: 0 } };
            try {
                const parsed = typeof row.salesAdjustment === 'string' ? JSON.parse(row.salesAdjustment) : row.salesAdjustment;
                if (parsed) salesAdjustment = parsed;
            } catch (e) { }

            return {
                id: row.readingNumber,
                date: format(new Date(row.reportDate), 'yyyy-MM-dd HH:mm:ss'),
                reportDate: new Date(row.reportDate),
                businessName,
                address: businessAddress,
                grossSales: safeParseFloat(row.grossSales),
                returns: safeParseFloat(row.returns),
                discounts: safeParseFloat(row.discounts),
                netSales: safeParseFloat(row.netSales),
                vatSales: safeParseFloat(row.vatSales),
                vatAmount: safeParseFloat(row.vatAmount),
                vatExempt: safeParseFloat(row.vatExempt),
                zeroRated: safeParseFloat(row.zeroRated),
                nonVat: safeParseFloat(row.nonVat),
                paymentMethods: paymentMethods.map((pm: any) => ({
                    name: String(pm.name),
                    amount: safeParseFloat(pm.amount)
                })),
                transactionCount: row.transactionCount,
                startingCash: safeParseFloat(row.startingCash),
                cashSales: safeParseFloat(row.cashSales),
                cashInDrawer: safeParseFloat(row.cashInDrawer),
                cashierName: row.cashierName || 'Admin',
                terminalId: row.terminalId,
                terminalMin: row.posTerminal?.terminalMin || '',
                terminalSerialNumber: row.posTerminal?.terminalSerialNumber || '',
                minSaleId: row.minSaleId || '',
                maxSaleId: row.maxSaleId || '',
                minVoidId: row.minVoidId || '',
                maxVoidId: row.maxVoidId || '',
                minReturnId: row.minReturnId || '',
                maxReturnId: row.maxReturnId || '',
                previousReading: safeParseFloat(row.previousReading),
                runningTotal: safeParseFloat(row.runningTotal),
                voidAmount: safeParseFloat(row.voidAmount),
                vatAdjustment: safeParseFloat(row.vatAdjustment),
                discountSummary,
                salesAdjustment,
                actualCash: safeParseFloat(row.actualCash),
                variance: safeParseFloat(row.cashDifference),
                zCounter: row.zCounter,
                resetCounter: row.resetCounter
            };
        });

        return NextResponse.json({ success: true, data: mappedResults });
    }
  } catch (error: any) {
    console.error('Error fetching Z-readings:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch Z-readings', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        let { terminalId, cashierName } = body;
        terminalId = terminalId && terminalId !== 'all' ? terminalId : 'terminal_default_01';
        cashierName = cashierName || 'Admin';

        // Use transaction for atomic operations
        const result = await withTransaction(async (tx) => {
            const lastZ = await tx.zReading.findFirst({
                where: { terminalId },
                orderBy: { reportDate: 'desc' },
                select: { reportDate: true }
            });

            const startDate = lastZ?.reportDate ? format(new Date(lastZ.reportDate), 'yyyy-MM-dd HH:mm:ss') : null;
            const endDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
            const readingNumber = await getNextZReadingNumber();

            // Build date filter
            const dateFilter: any = {
                terminalId,
                isTraining: false
            };
            if (startDate) dateFilter.createdAt = { gt: new Date(startDate) };
            if (endDate) dateFilter.createdAt = { ...dateFilter.createdAt, lte: new Date(endDate) };

            // Get sales transactions
            const salesTxns = await tx.posTransaction.findMany({
                where: {
                    ...dateFilter,
                    saleTransaction: {
                        status: { notIn: ['Void', 'Voided', 'Cancelled', 'Returned'] }
                    }
                },
                include: { saleTransaction: { select: { total: true, receiptNumber: true } } }
            });

            const grossSales = salesTxns.reduce((sum, t) => sum + Number(t.saleTransaction?.total || 0), 0);
            const totalDiscounts = salesTxns.reduce((sum, t) => sum + Number(t.discountAmount || 0), 0);
            const receiptNumbers = salesTxns
                .filter(t => t.saleTransaction?.receiptNumber)
                .map(t => parseInt(t.saleTransaction!.receiptNumber || '0'));
            const minSaleId = receiptNumbers.length > 0 ? Math.min(...receiptNumbers) : 0;
            const maxSaleId = receiptNumbers.length > 0 ? Math.max(...receiptNumbers) : 0;

            // Get returns
            const returnsTxns = await tx.posTransaction.findMany({
                where: {
                    ...dateFilter,
                    saleTransaction: { status: 'Returned' }
                },
                include: { saleTransaction: { select: { total: true } } }
            });
            const totalReturns = returnsTxns.reduce((sum, t) => sum + Number(t.saleTransaction?.total || 0), 0);

            // Get voids
            const voidTxns = await tx.posTransaction.findMany({
                where: {
                    ...dateFilter,
                    saleTransaction: { status: { in: ['Void', 'Voided', 'Cancelled'] } }
                },
                include: { saleTransaction: { select: { total: true, receiptNumber: true } } }
            });
            const voidAmount = voidTxns.reduce((sum, t) => sum + Number(t.saleTransaction?.total || 0), 0);
            const voidReceiptNumbers = voidTxns
                .filter(t => t.saleTransaction?.receiptNumber)
                .map(t => parseInt(t.saleTransaction!.receiptNumber || '0'));
            const minVoidId = voidReceiptNumbers.length > 0 ? Math.min(...voidReceiptNumbers) : 0;
            const maxVoidId = voidReceiptNumbers.length > 0 ? Math.max(...voidReceiptNumbers) : 0;

            // Get return sequences
            const returnSeqTxns = await tx.posTransaction.findMany({
                where: { ...dateFilter, transactionType: 'return' }
            });
            const minReturnId = returnSeqTxns.length > 0 ? Math.min(...returnSeqTxns.map(t => parseInt(String(t.id).slice(-6)))) : 0;
            const maxReturnId = returnSeqTxns.length > 0 ? Math.max(...returnSeqTxns.map(t => parseInt(String(t.id).slice(-6)))) : 0;

            // Get discount summary
            const discountItems = await tx.posTransactionItem.findMany({
                where: {
                    discountAmount: { gt: 0 },
                    posTransaction: {
                        ...dateFilter,
                        saleTransaction: {
                            status: { notIn: ['Void', 'Voided', 'Cancelled', 'Returned'] }
                        }
                    }
                },
                select: {
                    discountType: true,
                    discountAmount: true,
                    posTransactionId: true
                }
            });

            const discountSummaryMap = new Map<string, { amount: number; txnIds: Set<string>; itemCount: number }>();
            for (const item of discountItems) {
                const type = item.discountType || 'percent';
                const existing = discountSummaryMap.get(type) || { amount: 0, txnIds: new Set(), itemCount: 0 };
                existing.amount += Number(item.discountAmount);
                existing.txnIds.add(String(item.posTransactionId));
                existing.itemCount += 1;
                discountSummaryMap.set(type, existing);
            }

            // Get VAT summary
            const vatItems = await tx.posTransactionItem.findMany({
                where: {
                    posTransaction: {
                        ...dateFilter,
                        saleTransaction: {
                            status: { notIn: ['Void', 'Voided', 'Cancelled', 'Returned'] }
                        }
                    }
                },
                select: {
                    taxType: true,
                    lineTotal: true
                }
            });

            const vatSummaryMap = new Map<string, { totalAmount: number; vatAmount: number }>();
            for (const item of vatItems) {
                const type = item.taxType || 'VAT';
                const lineTotal = Number(item.lineTotal);
                const existing = vatSummaryMap.get(type) || { totalAmount: 0, vatAmount: 0 };
                existing.totalAmount += lineTotal;
                if (type === 'VAT') {
                    existing.vatAmount += lineTotal - (lineTotal / 1.12);
                }
                vatSummaryMap.set(type, existing);
            }

            // Get shift data
            const shiftData = await tx.shift.findMany({
                where: {
                    terminalId,
                    startTime: {
                        ...(startDate && { gt: new Date(startDate) }),
                        lte: new Date(endDate)
                    }
                },
                select: {
                    startingCash: true,
                    actualCash: true,
                    cashDifference: true
                }
            });

            const totalStartingCash = shiftData.reduce((sum, s) => sum + Number(s.startingCash), 0);
            const totalActualCash = shiftData.reduce((sum, s) => sum + Number(s.actualCash), 0);
            const totalCashDifference = shiftData.reduce((sum, s) => sum + Number(s.cashDifference), 0);

            // Get payment methods
            const paymentTxns = await tx.saleTransaction.findMany({
                where: {
                    status: { notIn: ['Void', 'Voided', 'Cancelled', 'Returned'] },
                    posTransaction: { ...dateFilter }
                },
                select: { paymentMethod: true, total: true }
            });

            const paymentsByMethod = new Map<string, number>();
            for (const payment of paymentTxns) {
                const method = payment.paymentMethod || 'Unknown';
                paymentsByMethod.set(method, (paymentsByMethod.get(method) || 0) + Number(payment.total));
            }

            // Calculate values
            const rawNetSales = grossSales;
            const finalNetSales = rawNetSales;
            const vatVAT = vatSummaryMap.get('VAT');
            const vatTotalAmount = vatVAT?.totalAmount || 0;
            const vatAmount = vatVAT?.vatAmount || 0;
            const vatableSales = vatTotalAmount - vatAmount;
            const startingCash = totalStartingCash;
            const actualCash = totalActualCash;
            const cashVariance = totalCashDifference;
            const cashSales = paymentsByMethod.get('CASH') || 0;
            const cashInDrawer = startingCash + cashSales;

            const paymentMethods = Array.from(paymentsByMethod.entries()).map(([name, amount]) => ({ name, amount }));

            // Get terminal data
            const term = await tx.posTerminal.findUnique({
                where: { id: terminalId },
                select: {
                    terminalMin: true,
                    terminalSerialNumber: true,
                    zCounter: true,
                    resetCounter: true
                }
            });

            // Get previous reading total
            const prevReadings = await tx.zReading.findMany({
                where: {
                    terminalId,
                    reportDate: { lte: startDate ? new Date(startDate) : new Date('2000-01-01') }
                },
                select: { netSales: true }
            });
            const previousTotal = prevReadings.reduce((sum, z) => sum + Number(z.netSales), 0);

            const vatExemptSales = vatSummaryMap.get('VAT_EXEMPT')?.totalAmount || 0;
            const zeroRatedSales = vatSummaryMap.get('ZERO_RATED')?.totalAmount || 0;
            const nonVatSales = vatSummaryMap.get('NON_VAT')?.totalAmount || 0;
            const vatAdjustmentAmount = Array.from(vatSummaryMap.entries())
                .filter(([type]) => type !== 'VAT')
                .reduce((acc, [, data]) => acc + (data.vatAmount || 0), 0);

            const discountSummary = Array.from(discountSummaryMap.entries()).map(([type, data]) => ({
                type,
                amount: data.amount,
                count: data.txnIds.size,
                itemCount: data.itemCount
            }));

            const salesAdjustment = {
                void: { count: voidTxns.length, amount: voidAmount },
                return: { count: returnSeqTxns.length, amount: totalReturns }
            };

            const previousReading = previousTotal;
            const runningTotal = previousReading + finalNetSales;

            // Create Z-Reading
            const newZReading = await tx.zReading.create({
                data: {
                    readingNumber,
                    reportDate: new Date(endDate),
                    terminalId,
                    cashierName,
                    grossSales: rawNetSales + totalDiscounts + totalReturns + voidAmount,
                    returns: totalReturns,
                    discounts: totalDiscounts,
                    netSales: finalNetSales,
                    vatSales: vatableSales,
                    vatAmount: vatAmount,
                    vatExempt: vatExemptSales,
                    zeroRated: zeroRatedSales,
                    nonVat: nonVatSales,
                    paymentMethods: paymentMethods as any,
                    transactionCount: salesTxns.length,
                    startingCash: startingCash,
                    cashSales: cashSales,
                    cashInDrawer: cashInDrawer,
                    minSaleId: String(minSaleId).padStart(6, '0'),
                    maxSaleId: String(maxSaleId).padStart(6, '0'),
                    minVoidId: String(minVoidId).padStart(6, '0'),
                    maxVoidId: String(maxVoidId).padStart(6, '0'),
                    minReturnId: String(minReturnId).padStart(6, '0'),
                    maxReturnId: String(maxReturnId).padStart(6, '0'),
                    voidAmount: voidAmount,
                    previousReading: previousReading,
                    runningTotal: runningTotal,
                    vatAdjustment: vatAdjustmentAmount,
                    discountSummary: discountSummary as any,
                    salesAdjustment: salesAdjustment as any,
                    zCounter: (term?.zCounter || 0) + 1,
                    resetCounter: term?.resetCounter || 0,
                    actualCash: actualCash,
                    cashDifference: cashVariance
                }
            });

            // Update terminal z_counter
            await tx.posTerminal.update({
                where: { id: terminalId },
                data: { zCounter: (term?.zCounter || 0) + 1 }
            });

            // Get settings for response
            const settings = await tx.posSetting.findFirst({
                select: { businessName: true, address: true }
            });

            const generatedReading = {
                id: readingNumber,
                date: endDate,
                reportDate: new Date(endDate),
                businessName: settings?.businessName || 'Business Name',
                address: settings?.address || '',
                grossSales: rawNetSales + totalDiscounts + totalReturns + voidAmount,
                returns: totalReturns,
                discounts: totalDiscounts,
                netSales: finalNetSales,
                vatSales: vatableSales,
                vatAmount,
                paymentMethods,
                transactionCount: salesTxns.length,
                startingCash,
                cashSales,
                cashInDrawer,
                cashierName,
                terminalId,
                terminalMin: term?.terminalMin || '',
                terminalSerialNumber: term?.terminalSerialNumber || '',
                minSaleId: String(minSaleId).padStart(6, '0'),
                maxSaleId: String(maxSaleId).padStart(6, '0'),
                minVoidId: String(minVoidId).padStart(6, '0'),
                maxVoidId: String(maxVoidId).padStart(6, '0'),
                minReturnId: String(minReturnId).padStart(6, '0'),
                maxReturnId: String(maxReturnId).padStart(6, '0'),
                previousReading,
                runningTotal,
                voidAmount,
                vatAdjustment: vatAdjustmentAmount,
                discountSummary,
                salesAdjustment,
                vatExempt: vatExemptSales,
                zeroRated: zeroRatedSales,
                nonVat: nonVatSales,
                actualCash,
                variance: cashVariance,
                zCounter: (term?.zCounter || 0) + 1,
                resetCounter: term?.resetCounter || 0
            };

            return generatedReading;
        });

        return NextResponse.json({ success: true, data: [result] });
    } catch (error: any) {
        console.error('Error in Z-Reading POST:', error);
        return NextResponse.json({ 
            success: false, 
            error: 'Failed to save Z-Reading',
            details: error.message 
        }, { status: 500 });
    }
}
