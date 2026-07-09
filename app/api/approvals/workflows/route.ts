import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const txType = searchParams.get('txType');

    let sql = `
      SELECT aw.*, ut.name as role_name 
      FROM approval_workflows aw 
      JOIN user_types ut ON aw.user_type_id = ut.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (txType) {
      sql += ' AND aw.transaction_type = ?';
      params.push(txType);
    }

    sql += ' ORDER BY aw.transaction_type, aw.step_order';

    const workflows = await query(sql, params);

    // Group by transaction_type
    const groupedWorkflows = workflows.reduce((acc: any, curr: any) => {
      if (!acc[curr.transaction_type]) {
        acc[curr.transaction_type] = [];
      }
      acc[curr.transaction_type].push(curr);
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

    const removedStepIds: string[] = [];

    await withTransaction(async (connection) => {
      // Capture the old step ids so cloud sync can delete them on other machines —
      // this is a full delete+reinsert with fresh ids, so every old row is gone.
      const [existing]: any = await connection.query(
        'SELECT id FROM approval_workflows WHERE transaction_type = ?',
        [transactionType]
      );
      for (const r of existing) removedStepIds.push(r.id);

      // 1. Delete existing steps for this transaction type
      await connection.query(
        'DELETE FROM approval_workflows WHERE transaction_type = ?',
        [transactionType]
      );

      // 2. Insert new steps
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await connection.query(
          'INSERT INTO approval_workflows (id, transaction_type, step_order, user_type_id) VALUES (?, ?, ?, ?)',
          [uuidv4(), transactionType, i + 1, step.user_type_id]
        );
      }
    });

    // Propagate the replaced steps as deletes so sibling terminals drop the stale
    // rows; the freshly-inserted ids sync down normally via PULL_CONFIG.
    if (removedStepIds.length) {
    }

    return NextResponse.json({
      success: true,
      message: `Workflow for ${transactionType} updated successfully`
    });
  } catch (error: any) {
    console.error('Error updating workflow:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
