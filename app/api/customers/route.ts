import { NextRequest, NextResponse } from 'next/server';
import { MySqlCustomerRepository } from '../../../src/infrastructure/repositories/MySqlCustomerRepository';
import { GetCustomersUseCase } from '../../../src/core/customers/application/GetCustomersUseCase';
import { CreateCustomerUseCase } from '../../../src/core/customers/application/CreateCustomerUseCase';

// Initialize dependencies
const customerRepository = new MySqlCustomerRepository();
const getCustomersUseCase = new GetCustomersUseCase(customerRepository);
const createCustomerUseCase = new CreateCustomerUseCase(customerRepository);

// GET endpoint to fetch customers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    const { customers, total } = await getCustomersUseCase.execute({
      limit,
      offset,
      filters: { search }
    });

    return NextResponse.json({
      success: true,
      data: customers,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId } = body;
    
    // Adapt the input to match the use case / entity
    const customerData = {
      ...body,
      id: customerId
    };

    const id = await createCustomerUseCase.execute(customerData);

    return NextResponse.json({
      success: true,
      message: 'Customer created successfully',
      data: { id, name: body.name },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create customer' },
      { status: error.message.includes('required') ? 400 : 500 }
    );
  }
}
