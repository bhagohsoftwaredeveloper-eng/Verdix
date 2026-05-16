import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const categories = await db.product.findMany({
      where: {
        category: {
          not: null,
          not: '',
        },
      },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    });

    const brands = await db.product.findMany({
      where: {
        brand: {
          not: null,
          not: '',
        },
      },
      distinct: ['brand'],
      select: { brand: true },
      orderBy: { brand: 'asc' },
    });

    return NextResponse.json({
      success: true,
      categories: categories
        .map((c: any) => c.category)
        .filter((c: string | null) => c !== null && c !== ''),
      brands: brands
        .map((b: any) => b.brand)
        .filter((b: string | null) => b !== null && b !== '')
    });
  } catch (error) {
    console.error('Error fetching product attributes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product attributes' },
      { status: 500 }
    );
  }
}
