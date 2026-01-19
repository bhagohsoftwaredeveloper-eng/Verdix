import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    const terminals = await query(
      'SELECT id, name FROM pos_terminals WHERE is_active = TRUE ORDER BY name ASC'
    );

    return NextResponse.json({
      success: true,
      data: terminals,
    });
  } catch (error) {
    console.error('Error fetching terminals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch terminals' },
      { status: 500 }
    );
  }
}
