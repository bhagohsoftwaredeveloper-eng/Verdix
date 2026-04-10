import { NextRequest, NextResponse } from 'next/server';
import { MySqlStockCountRepository } from '../../../../src/infrastructure/repositories/MySqlStockCountRepository';

// Initialize dependencies
const stockCountRepository = new MySqlStockCountRepository();

export async function GET() {
  try {
    const counts = await stockCountRepository.findAll();
    return NextResponse.json({
      success: true,
      data: counts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stock counts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock counts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = await stockCountRepository.create({
      ...body,
      id: `sc_${Date.now()}`,
      status: 'Draft'
    });

    return NextResponse.json({
      success: true,
      message: 'Stock count created successfully',
      data: { id },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating stock count:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create stock count' },
      { status: 500 }
    );
  }
}
