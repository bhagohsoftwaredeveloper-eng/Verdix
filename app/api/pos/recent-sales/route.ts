import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const terminalId = searchParams.get('terminalId');
    const queryParam = searchParams.get('query');
    const customerId = searchParams.get('customerId');

    // Fetch sales transactions using Prisma
    const sales = await db.salesTransaction.findMany({
      where: {
        AND: [
          { status: { notIn: ['Voided', 'Returned'] } },
          terminalId && terminalId !== 'all' ? { posTransaction: { terminalId } } : {},
          queryParam ? {
            OR: [
              { posTransaction: { orderNumber: { equals: parseInt(queryParam) || undefined } } },
              { id: { contains: queryParam } }
            ]
          } : {},
          customerId ? { customerId } : {}
        ]
      },
      include: {
        customer: {
          include: {
            loyalty: true
          }
        },
        posTransaction: {
          include: {
            terminal: true,
            user: true,
            paymentDetails: true
          }
        },
        items: {
          include: {
            product: true,
            posTransactionItems: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: queryParam ? undefined : 20
    });

    const salesWithItems = await Promise.all(
      sales.map(async (sale) => {
        // Point history for points earned
        const pointsEarnedResult = await db.pointHistory.aggregate({
          where: {
            transactionReference: sale.id,
            transactionType: 'purchase'
          },
          _sum: {
            points: true
          }
        });

        // Payment details for mappedPayments
        const paymentDetailsRows = sale.posTransaction?.paymentDetailsId ? await db.paymentDetails.findMany({
          where: { transactionId: sale.posTransaction.id }
        }) : [];

        const mappedPayments = paymentDetailsRows.map(row => ({
          method: row.paymentMethod,
          amount: Number(row.amountTendered || 0),
          reference: row.gatewayReference
        }));

        // Fetch amount_paid from sales_invoices if reference exists
        let amountPaid = 0;
        if (sale.reference) {
            const invoice = await db.salesInvoice.findFirst({
                where: { reference: sale.reference },
                select: { amountPaid: true }
            });
            amountPaid = Number(invoice?.amountPaid || 0);
        }

        return {
          id: sale.id,
          customer: {
            id: sale.customerId || 'walk-in',
            name: sale.customer?.name || 'Walk-in Customer',
            contactNumber: sale.customer?.contactNumber || '',
            paymentTerms: sale.customer?.paymentTerms || '',
          },
          date: sale.createdAt,
          dueDate: sale.dueDate,
          total: Number(sale.total),
          paidAmount: amountPaid,
          paymentMethod: sale.paymentMethod,
          payments: mappedPayments,
          status: sale.status,
          notes: sale.notes,
          orderNumber: sale.posTransaction?.orderNumber,
          reference: sale.reference,
          paymentReference: sale.posTransaction?.paymentReference,
          pointsEarned: Number(pointsEarnedResult._sum.points || 0),
          pointsUsedCount: Number(sale.posTransaction?.paymentDetails?.pointsUsed || 0),
          pointsBalance: sale.customer?.loyalty?.currentPoints ? Number(sale.customer.loyalty.currentPoints) : undefined,
          amountTendered: Number(sale.posTransaction?.paymentDetails?.amountTendered || sale.total),
          change: Number(sale.posTransaction?.paymentDetails?.changeGiven || 0),
          cashierName: sale.posTransaction?.user?.displayName || 'Admin',
          terminalMin: sale.posTransaction?.terminal?.terminalMin,
          terminalSerialNumber: sale.posTransaction?.terminal?.terminalSerialNumber,
          items: sale.items.map((item) => ({
            product: {
              id: item.productId,
              name: item.productName,
              sku: item.product.sku || '',
              barcode: item.product.barcode || '',
              price: Number(item.posTransactionItems[0]?.unitPrice || item.price),
              unitOfMeasure: item.product.unitOfMeasure || '',
              taxType: (() => {
                const s = (item.product.vatStatus || '').toUpperCase();
                if (s.includes('EXEMPT')) return 'VAT_EXEMPT';
                if (s.includes('ZERO')) return 'ZERO_RATED';
                if (s.includes('NON-VAT') || s.includes('NON VAT')) return 'NON_VAT';
                return 'VAT';
              })()
            },
            quantity: Number(item.quantity),
            price: Number(item.posTransactionItems[0]?.unitPrice || item.price),
            discount: Number(item.posTransactionItems.reduce((sum, pti) => sum + Number(pti.discountAmount), 0))
          })),
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: salesWithItems,
    });
  } catch (error: any) {
    console.error('Error fetching recent sales:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch recent sales' },
      { status: 500 }
    );
  }
}
