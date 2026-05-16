import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const status = searchParams.get('status') as any;
    const supplierId = searchParams.get('supplierId');

    const where: Prisma.BadOrderWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { supplierName: { contains: search, mode: 'insensitive' } },
        { purchaseOrderId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [badOrders, total] = await Promise.all([
      db.badOrder.findMany({
        where,
        orderBy: {
          reportDate: 'desc',
        },
        skip: offset,
        take: limit,
        include: {
          items: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      }),
      db.badOrder.count({ where }),
    ]);

    const ordersWithItems = badOrders.map(row => ({
      id: row.id,
      purchaseOrderId: row.purchaseOrderId,
      supplierId: row.supplierId,
      supplierName: row.supplierName,
      reportedBy: row.reportedBy || '',
      reportDate: row.reportDate,
      status: row.status,
      totalAffectedValue: Number(row.totalAffectedValue),
      notes: row.notes || '',
      resolutionNotes: row.resolutionNotes || '',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      items: row.items.map((item) => ({
        id: item.id,
        badOrderId: item.badOrderId,
        productId: item.productId,
        productName: item.productName,
        quantity: Number(item.quantity),
        cost: Number(item.cost),
        reason: item.reason,
        description: item.description || '',
        createdAt: item.createdAt,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: ordersWithItems,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching bad orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bad orders' },
      { status: 500 }
    );
  }
}

import { processBadOrderCreation } from '@/lib/bad-order-actions';
import { checkApprovalRequired, submitToApprovalQueue } from '@/lib/approvals';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, reportedBy } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: items' },
        { status: 400 }
      );
    }

    // Check if multi-level approval is required
    const isApprovalRequired = await checkApprovalRequired('BAD_ORDER');

    if (isApprovalRequired) {
      const { queueId, pendingApproval } = await submitToApprovalQueue('BAD_ORDER', body, reportedBy || 'system');
      
      if (pendingApproval) {
        return NextResponse.json({ 
          success: true, 
          pendingApproval: true, 
          queueId,
          message: 'Bad order submitted for multi-level approval' 
        });
      }
      // If not pending (all steps auto-skipped), fall through to direct creation
    }

    // Direct creation
    const result: any = await processBadOrderCreation(body, reportedBy || 'system');

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: { id: result.badOrderId },
        message: 'Bad order created successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in Bad Orders POST:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process bad order' },
      { status: 500 }
    );
  }
}
