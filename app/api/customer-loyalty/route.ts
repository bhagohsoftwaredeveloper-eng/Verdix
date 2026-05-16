import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isLoyaltyCardExpired } from '../../../lib/loyalty-utils';

// GET endpoint to fetch customer loyalty data
export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/customer-loyalty called');
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    const where: any = {};
    if (search) {
      where.OR = [
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { contactNumber: { contains: search, mode: 'insensitive' } } },
        { rfidCode: { contains: search, mode: 'insensitive' } }
      ];
    }

    const customersRaw = await db.customerLoyalty.findMany({
      where,
      include: {
        customer: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });

    // Add isExpired flag and flatten the structure to match original output
    const customers = customersRaw.map(cl => ({
      id: cl.id,
      customer_id: cl.customerId,
      name: cl.customer.name,
      contact_number: cl.customer.contactNumber,
      payment_terms: cl.customer.paymentTerms,
      rfid_code: cl.rfidCode,
      expiry_date: cl.expiryDate,
      point_setting: cl.pointSetting,
      loyaltyPoints: cl.currentPoints,
      last_transaction: cl.lastTransaction,
      created_at: cl.createdAt,
      updated_at: cl.updatedAt,
      isExpired: isLoyaltyCardExpired(cl.expiryDate)
    }));

    // Get total count for pagination
    const total = await db.customerLoyalty.count({ where });

    console.log('Returning success response with', customers.length, 'records');
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
    console.error('Error fetching customer loyalty data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer loyalty data' },
      { status: 500 }
    );
  }
}

// POST endpoint to create/update customer loyalty record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerId,
      rfidCode,
      expiryDate,
      pointSetting,
      initialPoints = 0
    } = body;

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Check if customer exists
    const customer = await db.customer.findUnique({
      where: { id: customerId }
    });
    
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if RFID code is already assigned to another customer
    if (rfidCode) {
      const rfidCheck = await db.customerLoyalty.findFirst({
        where: {
          rfidCode: rfidCode,
          customerId: { not: customerId }
        },
        include: {
          customer: true
        }
      });
      
      if (rfidCheck) {
        return NextResponse.json(
          { 
            success: false, 
            error: `RFID card ${rfidCode} is already assigned to customer ${rfidCheck.customer.name}.` 
          },
          { status: 400 }
        );
      }
    }

    // Check if loyalty record already exists
    const existingLoyalty = await db.customerLoyalty.findUnique({
      where: { customerId }
    });

    if (existingLoyalty) {
      // Update existing record
      await db.customerLoyalty.update({
        where: { customerId },
        data: {
          rfidCode: rfidCode || null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          pointSetting: pointSetting || null,
          currentPoints: initialPoints
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Customer loyalty updated successfully',
        data: { customerId },
        timestamp: new Date().toISOString()
      });
    } else {
      // Create new record
      await db.customerLoyalty.create({
        data: {
          customerId,
          rfidCode: rfidCode || null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          pointSetting: pointSetting || null,
          currentPoints: initialPoints
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Customer loyalty created successfully',
        data: { customerId },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error creating/updating customer loyalty:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create/update customer loyalty' },
      { status: 500 }
    );
  }
}
