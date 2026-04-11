import { NextRequest, NextResponse } from 'next/server';
import { MySqlStockCountRepository } from '../../../../../../src/infrastructure/repositories/MySqlStockCountRepository';
import { CompleteStockCountUseCase } from '../../../../../../src/core/inventory/application/CompleteStockCountUseCase';

// Initialize dependencies
const stockCountRepository = new MySqlStockCountRepository();
const completeStockCountUseCase = new CompleteStockCountUseCase(stockCountRepository);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
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
