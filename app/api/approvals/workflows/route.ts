import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const txType = searchParams.get('txType');

    const where: any = {};
    if (txType) {
      where.transactionType = txType;
    }

    const workflows = await db.approvalWorkflow.findMany({
      where,
      orderBy: [
        { transactionType: 'asc' },
        { stepOrder: 'asc' }
      ]
    });

    // Group by transaction_type
    const groupedWorkflows = workflows.reduce((acc: any, curr: any) => {
      if (!acc[curr.transactionType]) {
        acc[curr.transactionType] = [];
      }
      acc[curr.transactionType].push(curr);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: groupedWorkflows,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { transactionType, steps } = await request.json();

    if (!transactionType || !Array.isArray(steps)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    await withTransaction(async (tx) => {
      // 1. Delete existing steps for this transaction type
      await tx.approvalWorkflow.deleteMany({
        where: { transactionType }
      });

      // 2. Create new steps
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await tx.approvalWorkflow.create({
          data: {
            id: uuidv4(),
            transactionType,
            stepOrder: i + 1,
            userTypeId: step.user_type_id
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `Workflow for ${transactionType} updated successfully`
    });
  } catch (error: any) {
    console.error('Error updating workflow:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
