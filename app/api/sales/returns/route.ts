import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
import { Prisma } from '@prisma/client';
import { addFamilyStock, findUltimateRoot } from '@/lib/family-sync';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      saleId,
      items, // Array of { productId, productName, quantity, price }
      terminalId,
      userId,
      reason,
      totalAmount
    } = body;

    if (!saleId || !items || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Sale ID and items are required' }, { status: 400 });
    }

    return await withTransaction(async (tx) => {
      // Find a valid user ID if none provided
      let finalUserId = userId;
      if (!finalUserId) {
        const user = await tx.user.findFirst({
          select: { uid: true },
        });
        finalUserId = user?.uid || 'system';
      }

      const posTransId = `RTN-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      // 1. Create POS transaction for the return
      await tx.posTransaction.create({
        data: {
          id: posTransId,
          saleId,
          userId: finalUserId,
          terminalId: terminalId || null,
          transactionType: 'return',
          subtotal: new Prisma.Decimal(-totalAmount),
          taxAmount: new Prisma.Decimal(0),
          discountAmount: new Prisma.Decimal(0),
          totalAmount: new Prisma.Decimal(-totalAmount),
          paymentMethod: 'Return',
          paymentStatus: 'completed',
          notes: reason || 'Merchandise Credit',
          transactionTime: new Date(),
        },
      });

      // 2. Process each returned item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const saleItemId = `${posTransId}-ITEM-${i + 1}`;
        const posItemId = `${posTransId}-DETAIL-${i + 1}`;

        // Create sale item entry
        await tx.saleItem.create({
          data: {
            id: saleItemId,
            saleId,
            productId: item.productId,
            productName: item.productName,
            quantity: -item.quantity, // Negative for returns
            price: new Prisma.Decimal(item.price),
          },
        });

        // Create POS transaction item entry
        await tx.posTransactionItem.create({
          data: {
            id: posItemId,
            posTransactionId: posTransId,
            saleItemId,
            productId: item.productId,
            productName: item.productName,
            quantity: new Prisma.Decimal(-item.quantity),
            unitPrice: new Prisma.Decimal(item.price),
            discountPercentage: new Prisma.Decimal(0),
            discountAmount: new Prisma.Decimal(0),
            lineTotal: new Prisma.Decimal(-(item.quantity * item.price)),
          },
        });

        // Handle inventory - fetch product info
        const soldProd = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true, parentId: true, name: true, stock: true },
        });

        if (soldProd) {
          // Walk up the ancestor chain using helper (note: helper needs tx context)
          // For now, simplified: just add back to the product directly
          const newStock = soldProd.stock.toNumber() + item.quantity;
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: new Prisma.Decimal(newStock) },
          });

          // Record stock movement
          const movementId = `MOV-RTN-${Date.now()}-${i}`;
          await tx.stockMovement.create({
            data: {
              id: movementId,
              productId: item.productId,
              productName: soldProd.name,
              movementType: 'return',
              quantityChange: new Prisma.Decimal(item.quantity),
              previousStock: soldProd.stock,
              newStock: new Prisma.Decimal(newStock),
              referenceId: saleId,
              referenceType: 'return',
              notes: `Return for Sale: ${saleId}`,
            },
          });

          // TODO: Integrate addFamilyStock logic if needed for hierarchical products
          // const { rootId, factorToRoot } = await findUltimateRoot(item.productId, tx);
        }
      }

      return NextResponse.json({
        success: true,
        data: { posTransId },
        message: 'Return processed successfully'
      });
    });

  } catch (error: any) {
    console.error('Error processing return:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process return' },
      { status: 500 }
    );
  }
}
