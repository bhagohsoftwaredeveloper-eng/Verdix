import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PosTransactionType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const saleId = searchParams.get('saleId');

    const transactions = await db.posTransaction.findMany({
      where: saleId ? { saleId } : {},
      include: {
        user: true,
        terminal: true,
        shift: true,
        sale: {
          include: {
            customer: true
          }
        }
      },
      orderBy: {
        transactionTime: 'desc'
      }
    });

    const formattedTransactions = transactions.map((pt) => ({
      id: pt.id,
      saleId: pt.saleId,
      shiftId: pt.shiftId,
      userId: pt.userId,
      terminalId: pt.terminalId,
      transactionType: pt.transactionType,
      subtotal: pt.subtotal.toNumber(),
      taxAmount: pt.taxAmount.toNumber(),
      discountAmount: pt.discountAmount.toNumber(),
      totalAmount: pt.totalAmount.toNumber(),
      paymentMethod: pt.paymentMethod,
      paymentReference: pt.paymentReference,
      customerCount: pt.customerCount,
      transactionTime: pt.transactionTime,
      voidReason: pt.voidReason,
      notes: pt.notes,
      createdAt: pt.createdAt,
      updatedAt: pt.updatedAt,
      user: pt.user ? {
        id: pt.user.uid,
        username: pt.user.username,
        fullName: pt.user.displayName,
        role: pt.user.userType
      } : undefined,
      terminal: pt.terminal ? {
        id: pt.terminal.id,
        name: pt.terminal.name,
        location: pt.terminal.location,
        ipAddress: pt.terminal.ipAddress
      } : undefined,
      shift: pt.shift ? {
        id: pt.shift.id,
        startTime: pt.shift.startTime,
        endTime: pt.shift.endTime,
        status: pt.shift.status
      } : undefined,
      sale: pt.sale ? {
        id: pt.sale.id,
        customer: {
          id: pt.sale.customer?.id || '',
          name: pt.sale.customer?.name || 'Walk-in Customer',
          contactNumber: pt.sale.customer?.contactNumber || ''
        }
      } : undefined
    }));

    return NextResponse.json({
      success: true,
      data: formattedTransactions,
      count: formattedTransactions.length
    });
  } catch (error) {
    console.error('Error fetching POS transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch POS transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      saleId,
      shiftId,
      userId,
      terminalId,
      transactionType = 'sale',
      subtotal,
      taxAmount = 0,
      discountAmount = 0,
      totalAmount,
      paymentMethod,
      paymentReference,
      customerCount = 1,
      voidReason,
      notes
    } = body;

    const posTransaction = await db.posTransaction.create({
      data: {
        saleId,
        shiftId: shiftId || null,
        userId,
        terminalId: terminalId || null,
        transactionType: transactionType as PosTransactionType,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        paymentMethod,
        paymentReference: paymentReference || null,
        customerCount,
        voidReason: voidReason || null,
        notes: notes || null,
        transactionTime: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: { id: posTransaction.id },
      message: 'POS transaction created successfully'
    });
  } catch (error) {
    console.error('Error creating POS transaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create POS transaction' },
      { status: 500 }
    );
  }
}
