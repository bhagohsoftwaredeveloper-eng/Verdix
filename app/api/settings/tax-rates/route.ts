
import { NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const taxRates = (await query('SELECT * FROM tax_rates ORDER BY created_at DESC')) as any[];
    return NextResponse.json(taxRates);
  } catch (error) {
    console.error('Error fetching tax rates:', error);
    return NextResponse.json({ error: 'Failed to fetch tax rates' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, rate, description, isDefault } = body;

    // Validation
    if (!name || rate === undefined) {
      return NextResponse.json({ error: 'Name and rate are required' }, { status: 400 });
    }

    if (isDefault) {
      // If this is set as default, unset others
      await query('UPDATE tax_rates SET is_default = FALSE');
    }

    const id = uuidv4();
    await query(
      'INSERT INTO tax_rates (id, name, rate, description, is_default) VALUES (?, ?, ?, ?, ?)',
      [id, name, rate, description, isDefault ? 1 : 0]
    );

    return NextResponse.json({ id, name, rate, description, isDefault }, { status: 201 });
  } catch (error) {
    console.error('Error creating tax rate:', error);
    return NextResponse.json({ error: 'Failed to create tax rate' }, { status: 500 });
  }
}
