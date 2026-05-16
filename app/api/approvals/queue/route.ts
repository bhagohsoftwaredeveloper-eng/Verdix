import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const txType = searchParams.get('txType');

    // Build where clause
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (txType) {
      where.transactionType = txType;
    }

    // Fetch queue items with requester and history info
    const queueItems = await db.approvalQueue.findMany({
      where,
      include: {
        history: {
          orderBy: { createdAt: 'asc' }
        },
        customer: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (queueItems.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Fetch workflows for the specific transaction types in the queue
    const txTypes = Array.from(new Set(queueItems.map((i: typeof queueItems[0]) => i.transactionType)));
    const workflows = await db.approvalWorkflow.findMany({
      where: {
        transactionType: { in: txTypes }
      },
      orderBy: { stepOrder: 'asc' }
    });

    // Enrich items with workflow info
    const enrichedItems = queueItems.map((item: typeof queueItems[0]) => {
      const itemWorkflow = workflows.filter((w: typeof workflows[0]) => w.transactionType === item.transactionType);
      const currentStepInfo = itemWorkflow.find((w: typeof workflows[0]) => w.stepOrder === item.currentStep);

      const parsedData = item.transactionData as any;

      return {
        ...item,
        transaction_data: parsedData,
        history: item.history,
        workflow: itemWorkflow,
        currentStepRole: currentStepInfo?.userTypeId || 'Unknown',
        currentStepRoleId: currentStepInfo?.userTypeId || null
      };
    });

    // ── Enrich missing warehouse / shelf names ─────────────────────────────
    // Collect IDs that need resolution
    const warehouseIdSet = new Set<string>();
    const shelfIdSet = new Set<string>();
    const productIdSet = new Set<string>(); // for STOCK_ADJUSTMENT missing warehouse

    for (const item of enrichedItems) {
      const d = item.transaction_data;
      if (!d) continue;
      if (!d.warehouseName && d.warehouseId)       warehouseIdSet.add(d.warehouseId);
      if (!d.fromWarehouseName && d.sourceWarehouseId) warehouseIdSet.add(d.sourceWarehouseId);
      if (!d.toWarehouseName && d.targetWarehouseId)   warehouseIdSet.add(d.targetWarehouseId);
      if (!d.shelfName && d.shelfId)                shelfIdSet.add(d.shelfId);
      // For STOCK_ADJUSTMENT with productId but no warehouseName/shelfName
      if (item.transactionType === 'STOCK_ADJUSTMENT' && d.productId && !d.warehouseName) {
        productIdSet.add(d.productId);
      }
    }

    // Batch fetch warehouse names
    const warehouseMap: Record<string, string> = {};
    if (warehouseIdSet.size > 0) {
      const whRows = await db.warehouse.findMany({
        where: { id: { in: [...warehouseIdSet] } },
        select: { id: true, name: true }
      });
      for (const r of whRows) warehouseMap[r.id] = r.name;
    }

    // Batch fetch shelf names
    const shelfMap: Record<string, string> = {};
    if (shelfIdSet.size > 0) {
      const shRows = await db.shelfLocation.findMany({
        where: { id: { in: [...shelfIdSet] } },
        select: { id: true, name: true }
      });
      for (const r of shRows) shelfMap[r.id] = r.name;
    }

    // Batch fetch warehouse+shelf for products missing that info (STOCK_ADJUSTMENT)
    const productWarehouseMap: Record<string, { warehouseName: string | null; shelfName: string | null }> = {};
    if (productIdSet.size > 0) {
      const pRows = await db.product.findMany({
        where: { id: { in: [...productIdSet] } },
        select: {
          id: true,
          warehouseId: true,
          shelfLocationId: true,
          warehouse: { select: { name: true } },
          productShelves: { select: { shelf: { select: { name: true } } } }
        }
      });
      for (const r of pRows) {
        const shelfName = r.productShelves?.[0]?.shelf?.name || null;
        const warehouseName = r.warehouse?.name || null;
        productWarehouseMap[r.id] = {
          warehouseName,
          shelfName,
        };
      }
    }

    // Apply enrichment to each item
    for (const item of enrichedItems) {
      const d = item.transaction_data;
      if (!d) continue;

      if (!d.warehouseName && d.warehouseId && warehouseMap[d.warehouseId]) {
        d.warehouseName = warehouseMap[d.warehouseId];
      }
      if (!d.fromWarehouseName && d.sourceWarehouseId && warehouseMap[d.sourceWarehouseId]) {
        d.fromWarehouseName = warehouseMap[d.sourceWarehouseId];
      }
      if (!d.toWarehouseName && d.targetWarehouseId && warehouseMap[d.targetWarehouseId]) {
        d.toWarehouseName = warehouseMap[d.targetWarehouseId];
      }
      if (!d.shelfName && d.shelfId && shelfMap[d.shelfId]) {
        d.shelfName = shelfMap[d.shelfId];
      }

      // For STOCK_ADJUSTMENT: fill from product lookup if still missing
      if (item.transactionType === 'STOCK_ADJUSTMENT' && d.productId) {
        const pw = productWarehouseMap[d.productId];
        if (pw) {
          if (!d.warehouseName && pw.warehouseName) d.warehouseName = pw.warehouseName;
          if (!d.shelfName && pw.shelfName) d.shelfName = pw.shelfName;
        }
      }
    }
    // ── Enrich missing barcode / SKU in item arrays ───────────────────────
    const itemProductIdSet = new Set<string>();

    for (const item of enrichedItems) {
      const d = item.transaction_data;
      if (!d) continue;
      for (const arr of [d.items, d.receivedItems]) {
        if (!Array.isArray(arr)) continue;
        for (const it of arr) {
          if (!it || typeof it !== 'object') continue;
          // Normalise legacy field names first (barcode → productBarcode, sku → productSku)
          if (!it.productBarcode && it.barcode) it.productBarcode = it.barcode;
          if (!it.productSku    && it.sku)     it.productSku    = it.sku;
          // Queue for DB lookup if still missing
          if (it.productId && (!it.productBarcode || !it.productSku)) {
            itemProductIdSet.add(it.productId);
          }
        }
      }
    }

    const productInfoMap: Record<string, { barcode: string | null; sku: string | null }> = {};
    if (itemProductIdSet.size > 0) {
      const piRows = await db.product.findMany({
        where: { id: { in: [...itemProductIdSet] } },
        select: { id: true, barcode: true, sku: true }
      });
      for (const r of piRows) productInfoMap[r.id] = { barcode: r.barcode || null, sku: r.sku || null };
    }

    for (const item of enrichedItems) {
      const d = item.transaction_data;
      if (!d) continue;
      for (const arr of [d.items, d.receivedItems]) {
        if (!Array.isArray(arr)) continue;
        for (const it of arr) {
          if (!it?.productId || !productInfoMap[it.productId]) continue;
          const pi = productInfoMap[it.productId];
          if (!it.productBarcode && pi.barcode) it.productBarcode = pi.barcode;
          if (!it.productSku    && pi.sku)     it.productSku    = pi.sku;
        }
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      data: enrichedItems,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching approval queue:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
