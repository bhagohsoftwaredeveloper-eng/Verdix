import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
import { addFamilyStock, deductFamilyStock, findUltimateRoot } from '@/lib/family-sync';

// GET endpoint to fetch stock adjustments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const productId = searchParams.get('productId');

    const where: any = {};
    if (productId) {
      where.productId = productId;
    }

    const [adjustments, total] = await Promise.all([
      db.stockAdjustment.findMany({
        where,
        include: {
          product: {
            select: {
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.stockAdjustment.count({ where })
    ]);

    const formattedAdjustments = adjustments.map(sa => ({
      id: sa.id,
      productId: sa.productId,
      productName: sa.product.name,
      quantity: Number(sa.quantity),
      reason: sa.reason,
      newStock: Number(sa.newStock),
      createdAt: sa.createdAt,
      updatedAt: sa.updatedAt
    }));

    return NextResponse.json({
      success: true,
      data: formattedAdjustments,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stock adjustments:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch stock adjustments',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new stock adjustment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, quantity, reason } = body;

    if (!productId || quantity === undefined || !reason) {
      return NextResponse.json(
        { success: false, error: 'Product ID, quantity, and reason are required' },
        { status: 400 }
      );
    }

    return await withTransaction(async (tx) => {
      // Get current product stock
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, stock: true }
      });

      if (!product) {
        throw new Error('Product not found');
      }

      const currentStock = Number(product.stock || 0);
      const newStock = currentStock + Number(quantity);

      // --- Family Stock Sync ---
      const { rootId, factorToRoot } = await findUltimateRoot(productId, tx);
      const rootQuantity = Math.abs(Number(quantity)) / factorToRoot;

      const adjustmentId = uuidv4();

      if (Number(quantity) < 0) {
        await deductFamilyStock(rootId, rootQuantity, adjustmentId, 'adjustment', reason, tx);
      } else if (Number(quantity) > 0) {
        await addFamilyStock(rootId, rootQuantity, adjustmentId, 'adjustment', reason, tx);
      } else {
        // If qty is 0, still update the product to refresh its timestamp
        await tx.product.update({
          where: { id: productId },
          data: { updatedAt: new Date() }
        });
      }

      // Record the adjustment
      // Fetch new stock after sync to be accurate
      const updatedProduct = await tx.product.findUnique({
        where: { id: productId },
        select: { stock: true }
      });
      const actualNewStock = updatedProduct?.stock || newStock;

      const adjustment = await tx.stockAdjustment.create({
        data: {
          id: adjustmentId,
          productId,
          quantity: Number(quantity),
          reason,
          newStock: actualNewStock,
          adjType: Number(quantity) >= 0 ? 'add' : 'remove',
          status: 'Completed',
          date: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Stock adjustment created successfully',
        data: {
          id: adjustment.id,
          productId,
          productName: product.name,
          quantity: Number(quantity),
          previousStock: currentStock,
          newStock: Number(actualNewStock),
          reason
        },
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    console.error('Error creating stock adjustment:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create stock adjustment',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
