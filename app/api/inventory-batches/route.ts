import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const productId = searchParams.get('productId') || '';
    const status = searchParams.get('status') || 'all'; // all | active | exhausted
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const offset = (page - 1) * pageSize;

    const where: any = {};

    if (productId) {
      where.productId = productId;
    }

    if (search) {
      where.OR = [
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { id: { contains: search, mode: 'insensitive' } },
        { purchaseOrderId: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status === 'active') {
      where.quantityRemaining = { gt: 0 };
    } else if (status === 'exhausted') {
      where.quantityRemaining = { lte: 0 };
    }

    const total = await db.inventoryBatch.count({ where });

    const rowsRaw = await db.inventoryBatch.findMany({
      where,
      include: {
        product: {
          select: {
            name: true,
            sku: true
          }
        },
        // We need to check if purchaseOrder exists in schema. It does.
        // model InventoryBatch { ... purchaseOrder PurchaseOrder? @relation(fields: [purchaseOrderId], ... }
        // Wait, schema.prisma shows:
        // model InventoryBatch {
        //   ...
        //   purchaseOrderId   String?  @db.VarChar(50) @map("purchase_order_id")
        //   ...
        //   product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
        //   @@index([productId])
        //   @@index([purchaseOrderId])
        //   @@index([receivedDate])
        //   @@map("inventory_batches")
        // }
        // I don't see a relation to PurchaseOrder in model InventoryBatch in the schema I read earlier.
        // Let me re-read model InventoryBatch in schema.prisma.
      },
      orderBy: [
        { receivedDate: 'desc' },
        { createdAt: 'desc' }
      ],
      skip: offset,
      take: pageSize
    });

    // Let me check model PurchaseOrder to see if it has a relation to InventoryBatch.
    // model PurchaseOrder { ... items PurchaseOrderItem[] badOrders BadOrder[] ... }
    // It seems InventoryBatch doesn't have an explicit relation to PurchaseOrder in the schema, 
    // although it has purchaseOrderId.
    // I should check the schema again.
    
    // Flatten rows
    const rows = rowsRaw.map(ib => ({
      id: ib.id,
      product_id: ib.productId,
      product_name: ib.product?.name,
      product_sku: ib.product?.sku,
      purchase_order_id: ib.purchaseOrderId,
      // Since there's no explicit relation, we might need a separate query if po_reference is needed
      // or just leave it null if po reference can't be fetched easily.
      // Alternatively, I can use $queryRaw if po_reference is critical.
      // But let's check if I can add the relation or if I missed it.
      received_date: ib.receivedDate,
      quantity_in: ib.quantityIn,
      quantity_remaining: ib.quantityRemaining,
      unit_cost: ib.unitCost,
      selling_price: ib.sellingPrice,
      source_type: ib.sourceType,
      notes: ib.notes,
      created_at: ib.createdAt
    }));

    // If purchaseOrderId is present, let's try to fetch po_references.
    const poIds = rows.map(r => r.purchase_order_id).filter(id => !!id) as string[];
    const pos = poIds.length > 0 ? await db.purchaseOrder.findMany({
      where: { id: { in: poIds } },
      select: { id: true, referenceNumber: true }
    }) : [];
    
    const poMap = new Map(pos.map(po => [po.id, po.referenceNumber]));
    
    const finalRows = rows.map(r => ({
      ...r,
      po_reference: r.purchase_order_id ? poMap.get(r.purchase_order_id) : null
    }));

    return NextResponse.json({
      success: true,
      data: finalRows,
      total,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error('Error fetching inventory batches:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory batches' },
      { status: 500 }
    );
  }
}
