import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const categories = await query('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != "" ORDER BY category');
    const brands = await query('SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand != "" ORDER BY brand');

    return NextResponse.json({
        success: true,
        categories: categories.map((c: any) => c.category),
        brands: brands.map((b: any) => b.brand)
    });
  } catch (error: any) {
    console.error('Error fetching product attributes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product attributes' },
      { status: 500 }
    );
  }
}
