import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
import { deductFamilyStock, findUltimateRoot } from '@/lib/family-sync';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('countOnly') === 'true';

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const customerId = searchParams.get('customerId');
    const reference = searchParams.get('reference');
    const search = searchParams.get('search');

    // Build where filter
    const where: any = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (reference) where.reference = { contains: reference, mode: 'insensitive' };
    if (startDate) {
      where.orderDate = { ...where.orderDate, gte: new Date(startDate) };
    }
    if (endDate) {
      where.orderDate = { ...where.orderDate, lte: new Date(endDate) };
    }
    if (search) {
      where.OR = [
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { reference: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (countOnly) {
      const total = await db.salesOrder.count({ where });
      return NextResponse.json({
        success: true,
        total,
        timestamp: new Date().toISOString()
      });
    }

    // Get total count and sum for pagination
    const [totalRecords, sumResult] = await Promise.all([
      db.salesOrder.count({ where }),
      db.salesOrder.aggregate({
        where,
        _sum: { total: true }
      })
    ]);

    const totalPages = Math.ceil(totalRecords / limit);
    const totalAmount = Number(sumResult._sum?.total || 0);

    // Fetch orders with items
    const salesOrders = await db.salesOrder.findMany({
      where,
      include: {
        customer: true,
        items: {
          include: { product: true },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const ordersWithItems = salesOrders.map((row) => {
      const formattedItems = row.items.map((item) => ({
        product: {
          id: item.productId,
          name: item.productName,
          sku: item.product?.sku || '',
          barcode: item.product?.barcode || '',
          price: Number(item.price),
        },
        quantity: item.quantity,
        price: Number(item.price),
      }));

      return {
        id: row.id,
        customer: {
          id: row.customerId || '',
          name: row.customer?.name || 'Walk-in Customer',
          contactNumber: row.customer?.contactNumber || '',
          paymentTerms: row.customer?.paymentTerms || '',
          salesArea: row.customer?.salesArea || '',
        },
        orderDate: row.orderDate,
        deliveryDate: row.deliveryDate,
        reference: row.reference,
        deliveryAddress: row.deliveryAddress,
        total: Number(row.total),
        formattedTotal: `₱${Number(row.total).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        paymentMethod: row.paymentMethod || '',
        status: row.status as 'Pending' | 'Paid' | 'Shipped' | 'Delivered' | 'Failed' | 'Returned',
        notes: row.notes,
        items: formattedItems,
        date: row.orderDate,
        invoiceDate: row.orderDate,
      };
    });

    return NextResponse.json({
      success: true,
      data: ordersWithItems,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages
      },
      summary: {
        totalCount: totalRecords,
        totalAmount: totalAmount
      },
      count: ordersWithItems.length
    });
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customer,
      orderDate,
      deliveryDate,
      reference,
      deliveryAddress,
      paymentMethod,
      status,
      items
    } = body;

    // Basic validation
    if (!customer || !customer.id) {
        return NextResponse.json(
            { success: false, error: 'Customer is required' },
            { status: 400 }
        );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        return NextResponse.json(
            { success: false, error: 'At least one item is required' },
            { status: 400 }
        );
    }

    // Validate items have products
    for (const item of items) {
        if (!item.product || !item.product.id) {
            return NextResponse.json(
                { success: false, error: `Product information missing for one or more items` },
                { status: 400 }
            );
        }
    }

    // Calculate total
    const total = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

    return await withTransaction(async (tx) => {
      // Create sales order
      const newOrder = await tx.salesOrder.create({
        data: {
          customerId: customer.id,
          orderDate: new Date(orderDate),
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          reference: reference || null,
          deliveryAddress: deliveryAddress || null,
          total,
          paymentMethod: paymentMethod || null,
          status: (status || 'Pending') as any,
          notes: null
        }
      });

      // Create order items and handle inventory
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        await tx.salesOrderItem.create({
          data: {
            salesOrderId: newOrder.id,
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            price: item.price
          }
        });

        // --- Inventory Check Logic ---
        const settings = await tx.posSetting.findFirst({
          select: { enableNegativeInventory: true }
        });
        const enableNegativeInventory = settings?.enableNegativeInventory || false;

        if (!enableNegativeInventory) {
          const prod = await tx.product.findUnique({
            where: { id: item.product.id },
            select: { stock: true, name: true }
          });
          if (prod) {
            const currentStock = Number(prod.stock);
            if (currentStock < item.quantity) {
              throw new Error(`Insufficient stock for product: ${prod.name}. Current stock: ${currentStock}, Requested: ${item.quantity}`);
            }
          }
        }

        // --- Recursive Inventory Deduction (Full Ancestor + Descendant Hierarchy) ---
        const soldProd = await tx.product.findUnique({
          where: { id: item.product.id },
          select: { id: true, parentId: true, unitOfMeasure: true, name: true, stock: true }
        });

        if (soldProd) {
          // Walk ALL the way up the ancestor chain (handles any depth)
          const { rootId, factorToRoot } = await findUltimateRoot(soldProd.id, tx as any);

          if (factorToRoot > 1 || rootId !== soldProd.id) {
            // Sold a non-root item — convert to root units and deduct from root downward
            const rootQty = item.quantity / factorToRoot;
            await deductFamilyStock(
              rootId, rootQty, newOrder.id, 'sale',
              `Sales Order: ${reference || newOrder.id} (sold: ${soldProd.name})`, tx as any
            );
          } else {
            // Sold the root — deduct and propagate to all descendants
            await deductFamilyStock(
              soldProd.id, item.quantity, newOrder.id, 'sale',
              `Sales Order: ${reference || newOrder.id}`, tx as any
            );
          }
        }
      }

      return NextResponse.json({
        success: true,
        data: { id: newOrder.id },
        message: 'Sales order created successfully'
      });
    });
  } catch (error: any) {
    console.error('Error creating sales order:', error);
    if (error.message && error.message.includes('Insufficient stock')) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 400 }
        );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create sales order' },
      { status: 500 }
    );
  }
}
