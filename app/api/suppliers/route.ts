import { NextRequest, NextResponse } from 'next/server';
import { MySqlSupplierRepository } from '../../../src/infrastructure/repositories/MySqlSupplierRepository';
import { GetSuppliersUseCase } from '../../../src/core/suppliers/application/GetSuppliersUseCase';

// Initialize dependencies
const supplierRepository = new MySqlSupplierRepository();
const getSuppliersUseCase = new GetSuppliersUseCase(supplierRepository);

export async function GET() {
  try {
    const suppliers = await getSuppliersUseCase.execute();

    return NextResponse.json({
      success: true,
      data: suppliers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, contactPerson, contactNumber, email, address, active = true, paymentTerms, category } = body;

    if (!id || !name) {
      return NextResponse.json(
        { success: false, error: 'ID and Name are required' },
        { status: 400 }
      );
    }

    const supplierId = await supplierRepository.create({
      id, name, contactPerson, contactNumber, email, address, active, paymentTerms, category
    });

    return NextResponse.json({
      success: true,
      message: 'Supplier created successfully',
      data: { id: supplierId, name },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating supplier:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create supplier' },
      { status: 500 }
    );
  }
}
