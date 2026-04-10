import { NextRequest, NextResponse } from 'next/server';
import { MySqlWarehouseRepository } from '../../../src/infrastructure/repositories/MySqlWarehouseRepository';
import { GetWarehousesUseCase } from '../../../src/core/warehouses/application/GetWarehousesUseCase';

// Initialize dependencies
const warehouseRepository = new MySqlWarehouseRepository();
const getWarehousesUseCase = new GetWarehousesUseCase(warehouseRepository);

export async function GET() {
  try {
    const warehouses = await getWarehousesUseCase.execute();

    return NextResponse.json({
      success: true,
      data: warehouses,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch warehouses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, location, contactNumber, active = true, isMain = false } = body;

    if (!id || !name) {
      return NextResponse.json(
        { success: false, error: 'ID and Name are required' },
        { status: 400 }
      );
    }

    const warehouseId = await warehouseRepository.create({
      id, name, location, contactNumber, active, isMain
    });

    return NextResponse.json({
      success: true,
      message: 'Warehouse created successfully',
      data: { id: warehouseId, name },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating warehouse:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create warehouse' },
      { status: 500 }
    );
  }
}
