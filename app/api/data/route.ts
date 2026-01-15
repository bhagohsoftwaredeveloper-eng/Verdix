import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

// POST endpoint to receive data from Postman
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received data from Postman:', body);

    // You can save this data to your database if needed
    // Example: await query('INSERT INTO your_table (data) VALUES (?)', [JSON.stringify(body)]);

    // Or forward the data to another service
    // const externalResponse = await fetch('https://external-api.com/endpoint', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(body),
    // });

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
    // Example: Fetch data from database
    // const data = await query('SELECT * FROM your_table LIMIT 10');

    return NextResponse.json({
      success: true,
      message: 'API is working',
      timestamp: new Date().toISOString(),
      // data: data
    });
  } catch (error) {
    console.error('Error processing GET request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
