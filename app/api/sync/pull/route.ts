import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lastSync = searchParams.get('last_sync');

    let sql = 'SELECT * FROM products';
    const params: any[] = [];

    if (lastSync) {
      sql += ' WHERE updated_at > ?';
      params.push(lastSync);
    }

    const products = await query(sql, params);
    const categories = await query('SELECT * FROM categories');
    const brands = await query('SELECT * FROM brands');

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        products,
        categories,
        brands
      }
    });
  } catch (error: any) {
    console.error('Failed to pull sync data:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to pull sync data'
    }, { status: 500 });
  }
}
