import { NextRequest, NextResponse } from 'next/server';
import { MySqlStockMovementRepository } from '../../../src/infrastructure/repositories/MySqlStockMovementRepository';
import { GetStockMovementsUseCase } from '../../../src/core/inventory/application/GetStockMovementsUseCase';

// Initialize dependencies
const stockMovementRepository = new MySqlStockMovementRepository();
const getStockMovementsUseCase = new GetStockMovementsUseCase(stockMovementRepository);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId') || undefined;
    const warehouseId = searchParams.get('warehouseId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await getStockMovementsUseCase.execute({
      productId,
      warehouseId,
      startDate,
      endDate,
      limit,
      offset
    });

    return NextResponse.json({
      success: true,
      data: result.movements,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + limit < result.total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock movements' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = await stockMovementRepository.create(body);

    return NextResponse.json({
      success: true,
      message: 'Stock movement recorded successfully',
      data: { id },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error recording stock movement:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record stock movement' },
      { status: 500 }
    );
  }
}
