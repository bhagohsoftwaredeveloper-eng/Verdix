import { NextRequest, NextResponse } from 'next/server';

// POST endpoint to forward data to external APIs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetUrl, data, headers = {} } = body;

    if (!targetUrl) {
      return NextResponse.json(
        { success: false, error: 'targetUrl is required' },
        { status: 400 }
      );
    }

    console.log('Forwarding data to:', targetUrl);
    console.log('Data:', data);

    // Forward the request to the external API
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Data forwarded successfully',
      targetUrl,
      status: response.status,
      responseData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error forwarding data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to forward data' },
      { status: 500 }
    );
  }
}

// Example GET endpoint that forwards to an external service
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json({
        success: true,
        message: 'Forward API endpoint',
        usage: 'POST to forward data: { targetUrl: "https://external-api.com", data: {...} }',
        example: {
          targetUrl: "https://jsonplaceholder.typicode.com/posts",
          data: { title: "Test", body: "Test body", userId: 1 }
        }
      });
    }

    // Forward GET request to external service
    const response = await fetch(targetUrl);
    const data = await response.json();

    return NextResponse.json({
      success: true,
      forwardedFrom: targetUrl,
      data,
      status: response.status
    });
  } catch (error) {
    console.error('Error in GET forward:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch from external API' },
      { status: 500 }
    );
  }
}
