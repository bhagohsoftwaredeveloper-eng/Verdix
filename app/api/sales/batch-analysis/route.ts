import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * GET /api/sales/batch-analysis
 *
 * Returns batch-level profit analysis for sold items.
 * Each row represents units sold from a specific inventory batch.
 *
 * Query params:
 *   startDate  - YYYY-MM-DD (required)
 *   endDate    - YYYY-MM-DD (required)
 *   productId  - filter by specific product (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const productId = searchParams.get('productId');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const where: any = {
      sale: {
        createdAt: {
          gte: start,
          lte: end
        }
      },
      batchSource: {
        not: Prisma.JsonNull
      }
    };

    if (productId) {
      where.productId = productId;
    }

    const saleItems = await db.saleItem.findMany({
      where,
      include: {
        sale: true,
        product: true
      },
      orderBy: [
        { product: { name: 'asc' } },
        { sale: { createdAt: 'asc' } }
      ]
    });

    // Expand batch_source JSON into individual rows for the analysis table
    const analysis: any[] = [];

    for (const item of saleItems) {
      let splits: any[] = [];
      try {
        splits = Array.isArray(item.batchSource) ? item.batchSource : [];
      } catch { splits = []; }

      const sellingPrice = Number(item.price) || 0;

      for (const split of splits) {
        const qty = parseFloat(split.qty) || 0;
        const unitCost = parseFloat(split.unitCost) || 0;
        const lineRevenue = qty * sellingPrice;
        const lineCost = qty * unitCost;
        const lineProfit = lineRevenue - lineCost;
        const margin = lineRevenue > 0 ? (lineProfit / lineRevenue) * 100 : 0;

        // Try to get batch details (received_date, PO reference)
        let batchDate: string | null = null;
        let poReference: string | null = null;

        if (split.batchId && split.batchId !== 'fallback') {
          const batch = await db.inventoryBatch.findUnique({
            where: { id: split.batchId },
            select: { receivedDate: true, purchaseOrderId: true }
          });
          
          if (batch) {
            batchDate = batch.receivedDate
              ? batch.receivedDate.toISOString().split('T')[0]
              : null;
            poReference = batch.purchaseOrderId;
          }
        }

        analysis.push({
          saleDate: item.sale.createdAt
            ? item.sale.createdAt.toISOString().split('T')[0]
            : null,
          saleReference: item.sale.reference,
          productId: item.productId,
          productName: item.product.name,
          sku: item.product.sku,
          barcode: item.product.barcode,
          category: item.product.category,
          batchId: split.batchId,
          batchReceivedDate: batchDate,
          poReference,
          batchType: split.type || 'batch',
          qtySold: qty,
          unitCost,
          unitSellingPrice: sellingPrice,
          lineRevenue,
          lineCost,
          lineProfit,
          marginPct: parseFloat(margin.toFixed(2)),
        });
      }
    }

    // Summary totals
    const totals = analysis.reduce(
      (acc, row) => ({
        qty: acc.qty + row.qtySold,
        revenue: acc.revenue + row.lineRevenue,
        cost: acc.cost + row.lineCost,
        profit: acc.profit + row.lineProfit,
      }),
      { qty: 0, revenue: 0, cost: 0, profit: 0 }
    );

    return NextResponse.json({
      success: true,
      data: analysis,
      totals: {
        ...totals,
        marginPct: totals.revenue > 0
          ? parseFloat(((totals.profit / totals.revenue) * 100).toFixed(2))
          : 0,
      },
      count: analysis.length,
    });
  } catch (error: any) {
    console.error('[BatchAnalysis] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch batch analysis' },
      { status: 500 }
    );
  }
}
