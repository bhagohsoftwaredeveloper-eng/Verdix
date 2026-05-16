import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST endpoint to receive data from Postman
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received data from Postman:', body);

    // You can save this data to your database if needed
    // Example: await db.yourTable.create({ data: { ... } });

    return NextResponse.json({
      success: true,
      message: 'Data received successfully',
      receivedData: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing POST request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      message: 'API is working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing GET request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
