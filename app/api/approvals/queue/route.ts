import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const txType = searchParams.get('txType');

    // Fetch queue items with requester info
    let sql = `
      SELECT 
        aq.*,
        COALESCE(u.display_name, 'System') as requester_name,
        COALESCE(u.username, 'system@stockpilot.com') as requester_email
      FROM approval_queue aq
      LEFT JOIN users u ON aq.created_by = u.uid
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'ALL') {
      sql += ' AND aq.status = ?';
      params.push(status);
    }
    if (txType) {
      sql += ' AND aq.transaction_type = ?';
      params.push(txType);
    }

    sql += ' ORDER BY aq.created_at DESC';

    const queueItems: any[] = await query(sql, params);

    // Fetch history for these items
    const history: any = await query('SELECT * FROM approval_history ORDER BY created_at ASC');

    // Fetch workflows to know the role names for each step
    const workflows: any = await query(`
      SELECT aw.*, ut.name as role_name 
      FROM approval_workflows aw 
      JOIN user_types ut ON aw.user_type_id = ut.id
    `);

    // Group history and add workflow info
    const enrichedItems = queueItems.map(item => {
      const itemHistory = (history || []).filter((h: any) => h.approval_queue_id === item.id);
      const itemWorkflow = (workflows || []).filter((w: any) => w.transaction_type === item.transaction_type);
      
      const currentStepInfo = itemWorkflow.find((w: any) => w.step_order === item.current_step);

      return {
        ...item,
        transaction_data: typeof item.transaction_data === 'string' ? JSON.parse(item.transaction_data) : item.transaction_data,
        history: itemHistory,
        workflow: itemWorkflow,
        currentStepRole: currentStepInfo?.role_name || 'Unknown',
        currentStepRoleId: currentStepInfo?.user_type_id || null
      };
    });

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
