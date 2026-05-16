import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
import { deductFromBatches, getBatchCostingSettings } from '@/lib/batch-deduction';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate'); // yyyy-MM-dd
    const endDate = searchParams.get('endDate');     // yyyy-MM-dd
    const terminalId = searchParams.get('terminalId');
    const productId = searchParams.get('productId'); // Filter by product content
    const status = searchParams.get('status');       // 'Paid', 'Void', 'Returned'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions: any = {};

    if (terminalId && terminalId !== 'all') {
      whereConditions.terminalId = terminalId;
    }

    if (startDate) {
      whereConditions.transactionTime = {
        gte: new Date(`${startDate}T00:00:00`),
      };
    }

    if (endDate) {
      if (whereConditions.transactionTime) {
        whereConditions.transactionTime.lte = new Date(`${endDate}T23:59:59`);
      } else {
        whereConditions.transactionTime = {
          lte: new Date(`${endDate}T23:59:59`),
        };
      }
    }

    if (status) {
      if (status === 'Voided') {
        whereConditions.OR = [
          { transactionType: 'void' },
          { sale: { status: 'Voided' } }
        ];
      } else if (status === 'Returned') {
        whereConditions.OR = [
          { transactionType: 'return' },
          { sale: { status: 'Returned' } }
        ];
      } else if (status === 'Paid') {
        whereConditions.transactionType = 'sale';
        whereConditions.sale = { status: 'Paid' };
      } else {
        whereConditions.sale = { status };
      }
    }

    // Get total count
    let totalRecords = 0;
    if (productId) {
      // Count with product filter
      totalRecords = await db.posTransaction.count({
        where: {
          ...whereConditions,
          items: {
            some: {
              productId,
            },
          },
        },
      });
    } else {
      totalRecords = await db.posTransaction.count({
        where: whereConditions,
      });
    }
    const totalPages = Math.ceil(totalRecords / limit);

    // Get paginated transactions
    const whereForFetch = productId
      ? {
          ...whereConditions,
          items: {
            some: {
              productId,
            },
          },
        }
      : whereConditions;

    const transactions = await db.posTransaction.findMany({
      where: whereForFetch,
      include: {
        user: {
          select: {
            displayName: true,
          },
        },
        terminal: {
          select: {
            name: true,
          },
        },
        sale: {
          select: {
            id: true,
            reference: true,
            receiptNumber: true,
            transactionSource: true,
            status: true,
            customerId: true,
            customer: {
              select: {
                name: true,
                contactNumber: true,
              },
            },
          },
        },
        items: {
          include: {
            product: {
              select: {
                cost: true,
                description: true,
                unitOfMeasure: true,
              },
            },
          },
        },
        paymentDetails: {
          select: {
            gatewayReference: true,
          },
        },
      },
      orderBy: {
        transactionTime: 'desc',
      },
      skip: offset,
      take: limit,
    });

    // Transform data
    const data = transactions.map((row) => {
      const totalAmount = row.totalAmount.toNumber();
      const taxAmount = row.taxAmount.toNumber();
      const discountAmount = row.discountAmount.toNumber();
      const subtotal = row.subtotal.toNumber() || totalAmount;

      const items = row.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        description: item.product?.description,
        quantity: item.quantity.toNumber(),
        price: item.unitPrice.toNumber(),
        total: item.lineTotal.toNumber(),
        cost: item.product?.cost?.toNumber() || 0,
        discount: item.discountAmount.toNumber(),
        unitOfMeasure: item.product?.unitOfMeasure,
      }));

      const calculatedCost = items.reduce((sum: number, item: any) => sum + (item.cost * item.quantity), 0);
      const calculatedProfit = totalAmount - calculatedCost - taxAmount;
      const vatableSales = totalAmount - taxAmount;

      return {
        id: row.sale?.id,
        reference: row.sale?.reference,
        transactionSource: row.sale?.transactionSource || 'POS',
        orderNumber: row.orderNumber,
        receiptNo: row.sale?.receiptNumber || row.orderNumber,
        posTransactionId: row.id,
        date: row.transactionTime,
        total: totalAmount,
        subtotal: subtotal,
        discount: discountAmount,
        taxAmount: taxAmount,
        vatableSales: vatableSales,
        nonVatSales: 0,
        amountPaid: totalAmount,
        balance: 0,
        cost: calculatedCost,
        profit: calculatedProfit,
        notes: row.notes || '',
        paymentStatus: row.paymentStatus || 'completed',
        status: row.sale?.status || (row.transactionType === 'sale' ? 'Paid' : row.transactionType === 'return' ? 'Returned' : 'Voided'),
        transactionType: row.transactionType,
        paymentMethod: row.paymentMethod,
        paymentReference: row.paymentDetails?.gatewayReference,
        customer: {
          id: row.sale?.customerId,
          name: row.sale?.customer?.name || 'Walk-in Customer',
          contactNumber: row.sale?.customer?.contactNumber,
        },
        cashier: row.user?.displayName || 'N/A',
        terminal: row.terminal?.name || 'N/A',
        items,
        originalOrderNumber: null,
        originalTransactionTime: null,
        originalCashierName: null,
      };
    });

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error fetching POS transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      items,
      customer,
      paymentMethod,
      totalDue,
      userId,
      shiftId,
      terminalId,
      notes,
      amountTendered,
      change
    } = body;

    // Validation
    if (!items || items.length === 0) {
      return NextResponse.json({ success: false, error: 'No items in transaction' }, { status: 400 });
    }

    // Default User ID if not provided (safety check, though API users should provide it)
    const finalUserId = userId || 'api_user'; 

    // Generate IDs
    const saleId = `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const posTransId = `PT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const paymentDetailsId = `PD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const auditLogId = `PAL-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    return await withTransaction(async (tx) => {
      // 1. Log payment initiation
      await tx.paymentAuditLog.create({
        data: {
          id: auditLogId,
          transactionId: posTransId,
          paymentMethod,
          action: 'initiated',
          status: 'pending',
          amount: new Prisma.Decimal(totalDue),
          userId: finalUserId,
        },
      });

      // Generate sequential reference (INV-XXXXXX)
      // For now, using timestamp-based ID (in real scenario, use getNextReference helper)
      const sequentialRef = `INV-${Date.now().toString().slice(-6)}`;

      // 2. Create sales transaction
      const salesTransaction = await tx.salesTransaction.create({
        data: {
          id: saleId,
          reference: sequentialRef,
          receiptNumber: `REC-${Date.now()}`,
          customerId: (customer && customer.id !== 'walk-in') ? customer.id : null,
          invoiceDate: new Date(),
          date: new Date(),
          total: new Prisma.Decimal(totalDue),
          paymentMethod,
          status: 'Paid',
          transactionSource: 'POS',
          notes: notes || 'API Sale',
        },
      });

      // 3. Create sale items and update stock
      const { oversellBlock } = await getBatchCostingSettings(db);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemId = `${saleId}-ITEM-${i + 1}`;

        // BATCH COSTING: FIFO Deduction
        const deduction = await deductFromBatches(item.id, item.quantity, oversellBlock, db);

        await tx.saleItem.create({
          data: {
            id: itemId,
            saleId,
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            price: new Prisma.Decimal(item.price),
            costAtSale: new Prisma.Decimal(deduction.weightedAvgCost),
            batchSource: deduction.splits as any,
          },
        });

        // Stock Deduction
        const product = await tx.product.findUnique({
          where: { id: item.id },
          select: { stock: true, name: true },
        });

        if (product) {
          const currentStock = product.stock.toNumber();
          const newStock = currentStock - item.quantity;

          const movementId = `MOV-${Date.now()}-${i}`;
          await tx.stockMovement.create({
            data: {
              id: movementId,
              productId: item.id,
              productName: product.name,
              movementType: 'sale',
              quantityChange: new Prisma.Decimal(-item.quantity),
              previousStock: new Prisma.Decimal(currentStock),
              newStock: new Prisma.Decimal(newStock),
              referenceId: saleId,
              referenceType: 'sale',
              notes: 'API Sale',
            },
          });

          await tx.product.update({
            where: { id: item.id },
            data: { stock: new Prisma.Decimal(newStock) },
          });
        }
      }

      // 4. Create sales invoice (legacy/reporting sync)
      const invoiceId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      const salesInvoice = await tx.salesInvoice.create({
        data: {
          id: invoiceId,
          reference: sequentialRef,
          receiptNumber: `REC-${Date.now()}`,
          customerId: (customer && customer.id !== 'walk-in') ? customer.id : '',
          invoiceDate: new Date(),
          dueDate: new Date(),
          total: new Prisma.Decimal(totalDue),
          paymentMethod,
          status: 'Paid',
          transactionSource: 'POS',
          notes: notes || 'API Sale',
        },
      });

      // 5. Create POS transaction
      const posNotes = `API Transaction. Tendered: ${amountTendered || totalDue}`;

      const posTransaction = await tx.posTransaction.create({
        data: {
          id: posTransId,
          saleId,
          shiftId: shiftId || null,
          userId: finalUserId,
          terminalId: terminalId || null,
          transactionType: 'sale',
          subtotal: new Prisma.Decimal(totalDue),
          taxAmount: new Prisma.Decimal(0),
          discountAmount: new Prisma.Decimal(0),
          totalAmount: new Prisma.Decimal(totalDue),
          paymentMethod,
          paymentStatus: 'completed',
          paymentDetailsId: null,
          paymentValidatedAt: new Date(),
          notes: posNotes,
          transactionTime: new Date(),
        },
      });

      // 6. Create items for sales invoice and POS transaction
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const invoiceItemId = `${invoiceId}-ITEM-${i + 1}`;
        const posItemId = `${posTransId}-DETAIL-${i + 1}`;
        const saleItemId = `${saleId}-ITEM-${i + 1}`;

        await tx.salesInvoiceItem.create({
          data: {
            id: invoiceItemId,
            salesInvoiceId: invoiceId,
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            price: new Prisma.Decimal(item.price),
          },
        });

        await tx.posTransactionItem.create({
          data: {
            id: posItemId,
            posTransactionId: posTransId,
            saleItemId,
            productId: item.id,
            productName: item.name,
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.price),
            discountPercentage: new Prisma.Decimal(0),
            discountAmount: new Prisma.Decimal(0),
            lineTotal: new Prisma.Decimal(item.quantity * item.price),
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: { saleId, posTransId, orderNumber: null },
        message: 'Transaction created successfully via API'
      });
    });

  } catch (error: any) {
    console.error('Error creating sales transaction:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create transaction' },
      { status: 500 }
    );
  }
}

