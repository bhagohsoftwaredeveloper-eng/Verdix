import { NextRequest, NextResponse } from 'next/server';
import { MySqlStockCountRepository } from '../../../../../../src/infrastructure/repositories/MySqlStockCountRepository';
import { CompleteStockCountUseCase } from '../../../../../../src/core/inventory/application/CompleteStockCountUseCase';
import { checkApprovalRequired, submitToApprovalQueue } from '../../../../../../lib/approvals';
import { query } from '../../../../../../lib/mysql';

// Initialize dependencies
const stockCountRepository = new MySqlStockCountRepository();
const completeStockCountUseCase = new CompleteStockCountUseCase(stockCountRepository);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { completedBy } = body;

    // Check if multi-level approval is required
    const isApprovalRequired = await checkApprovalRequired('STOCK_COUNT');

    if (isApprovalRequired) {
      // Fetch some details for enrichment
      const countRes: any = await query('SELECT name FROM stock_counts WHERE id = ?', [id]);
      const countName = countRes[0]?.name || 'Unknown Count';

      // Fetch items with variances for enrichment
      const itemsSql = `
        SELECT sci.*, p.name as productName, p.sku as productSku
        FROM stock_count_items sci
        JOIN products p ON sci.product_id = p.id
        WHERE sci.stock_count_id = ? AND sci.counted_quantity IS NOT NULL AND sci.counted_quantity != sci.snapshot_quantity
      `;
      const varianceItems = await query(itemsSql, [id]);

      const approvalData = {
        stockCountId: id,
        name: countName,
        items: varianceItems,
        completedBy: completedBy || 'system'
      };

      const { queueId, pendingApproval } = await submitToApprovalQueue('STOCK_COUNT', approvalData, completedBy || 'system');
      
      if (pendingApproval) {
        return NextResponse.json({ 
          success: true, 
          pendingApproval: true, 
          queueId,
          message: 'Stock count submitted for multi-level approval' 
        });
      }
    }

    // Direct completion if no approval required or all steps skipped
    await completeStockCountUseCase.execute(id);

    return NextResponse.json({
      success: true,
      message: 'Stock count completed and inventory adjusted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error completing stock count:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to complete stock count' },
      { status: 500 }
    );
  }
}
