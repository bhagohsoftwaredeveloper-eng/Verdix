import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let sql = 'SELECT * FROM shelf_locations';
    if (activeOnly) {
      sql += ' WHERE is_active = TRUE';
    }
    sql += ' ORDER BY name ASC';

    const locations = await query(sql);

    return NextResponse.json({ success: true, data: locations });
  } catch (error) {
    console.error('Failed to fetch shelf locations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shelf locations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, description } = data;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const id = `shelf_${uuidv4()}`;
    const sql = `
      INSERT INTO shelf_locations (id, name, description, is_active)
      VALUES (?, ?, ?, TRUE)
    `;

    await query(sql, [id, name, description]);

    return NextResponse.json({
      success: true,
      data: { id, name, description, isActive: true },
    });
  } catch (error: any) {
    console.error('Failed to create shelf location:', error);
    // Handle specific MySQL errors
    if (error.code === 'ER_DUP_ENTRY') {
       return NextResponse.json(
        { success: false, error: 'A shelf location with this name already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create shelf location' },
      { status: 500 }
    );
  }
}
