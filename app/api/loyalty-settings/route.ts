import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

// GET endpoint to fetch loyalty settings
export async function GET(request: NextRequest) {
  try {
    const sql = `
      SELECT
        id,
        description,
        base,
        amount,
        equivalent,
        created_at,
        updated_at
      FROM loyalty_points_settings
      ORDER BY created_at DESC
    `;

    const settings = await query(sql);

    return NextResponse.json({
      success: true,
      data: settings,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching loyalty settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch loyalty settings' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new loyalty setting
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      description,
      base,
      amount,
      equivalent
    } = body;

    if (!id || !description) {
      return NextResponse.json(
        { success: false, error: 'ID and description are required' },
        { status: 400 }
      );
    }

    const sql = `
      INSERT INTO loyalty_points_settings (
        id, description, base, amount, equivalent
      ) VALUES (?, ?, ?, ?, ?)
    `;

    await query(sql, [id, description, base || 'amount', amount || 0, equivalent || 0]);

    return NextResponse.json({
      success: true,
      message: 'Loyalty setting created successfully',
      data: { id, description, base, amount, equivalent },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating loyalty setting:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create loyalty setting' },
      { status: 500 }
    );
  }
}
