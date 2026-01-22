import { NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

export async function GET() {
  try {
    const suppliers = await query('SELECT * FROM suppliers LIMIT 1');
    return NextResponse.json({ success: true, data: suppliers });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
