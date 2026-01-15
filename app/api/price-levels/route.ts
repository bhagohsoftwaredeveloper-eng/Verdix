import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

// GET endpoint to fetch price levels
export async function GET(request: NextRequest) {
  try {
    const priceLevels = await query('SELECT * FROM price_levels ORDER BY name ASC');
    return NextResponse.json({
      success: true,
      data: priceLevels,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching price levels:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch price levels' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new price level
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, isDefault = false } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const id = `level_${Date.now()}`;

    // If this is set as default, unset other defaults
    if (isDefault) {
      await query('UPDATE price_levels SET is_default = FALSE');
    }

    const sql = `
      INSERT INTO price_levels (id, name, description, is_default)
      VALUES (?, ?, ?, ?)
    `;

    await query(sql, [id, name, description, isDefault]);

    return NextResponse.json({
      success: true,
      message: 'Price level created successfully',
      data: { id, name, isDefault },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating price level:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create price level' },
      { status: 500 }
    );
  }
}
