import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST endpoint to send product data to external APIs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetUrl, productIds, headers = {} } = body;

    if (!targetUrl) {
      return NextResponse.json(
        { success: false, error: 'targetUrl is required' },
        { status: 400 }
      );
    }

    const where = productIds && productIds.length > 0 ? { id: { in: productIds } } : {};
    const products = await db.product.findMany({ where });

    if (products.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No products found' },
        { status: 404 }
      );
    }

    console.log(`Sending ${products.length} products to:`, targetUrl);

    // Send data to external API
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        source: 'Stockpilot',
        timestamp: new Date().toISOString(),
        products: products,
        totalProducts: products.length
      }),
    });

    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      responseData = { message: 'Could not parse response as JSON' };
    }

    return NextResponse.json({
      success: true,
      message: `${products.length} products sent successfully`,
      targetUrl,
      status: response.status,
      productsCount: products.length,
      responseData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error sending products:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send products' },
      { status: 500 }
    );
  }
}

// GET endpoint to see available products for sending
export async function GET() {
  try {
    const products = await db.product.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        category: true,
        brand: true,
        stock: true,
        price: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Available products to send',
      products,
      usage: {
        endpoint: 'POST /api/send-products',
        body: {
          targetUrl: 'https://your-other-app.com/api/products',
          productIds: ['optional-array-of-ids'],
          headers: { 'Authorization': 'Bearer token' }
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
