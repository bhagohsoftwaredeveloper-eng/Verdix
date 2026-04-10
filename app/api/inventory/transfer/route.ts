import { NextRequest, NextResponse } from 'next/server';
import { MySqlInventoryTransferRepository } from '../../../../src/infrastructure/repositories/MySqlInventoryTransferRepository';
import { TransferStockService } from '../../../../src/infrastructure/services/TransferStockService';
import { TransferStockUseCase } from '../../../../src/core/inventory/application/TransferStockUseCase';

// Initialize dependencies
const transferRepository = new MySqlInventoryTransferRepository();
const transferService = new TransferStockService();
const transferStockUseCase = new TransferStockUseCase(transferRepository, transferService);

export async function GET() {
  try {
    const transfers = await transferRepository.findAll();
    return NextResponse.json({
      success: true,
      data: transfers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transfers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const transferId = await transferStockUseCase.execute(body);

    return NextResponse.json({
      success: true,
      message: 'Inventory transfer processed successfully',
      data: { id: transferId },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error processing transfer:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process transfer' },
      { status: 500 }
    );
  }
}
