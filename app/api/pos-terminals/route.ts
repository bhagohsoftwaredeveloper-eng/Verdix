import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

// Helper function to ensure pos_terminals table exists
async function ensurePosTerminalsTable() {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS pos_terminals (
        id VARCHAR(50) PRIMARY KEY,
        ip_address VARCHAR(45),
        terminal_description VARCHAR(255),
        serial_number VARCHAR(100),
        min VARCHAR(100),
        permit_no VARCHAR(100),
        print_official_receipt VARCHAR(10),
        or_next_reference VARCHAR(100),
        inventory_location VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_terminal_description (terminal_description),
        INDEX idx_is_active (is_active)
      )
    `;
    
    await query(createTableSQL);
  } catch (error) {
    console.error('Error ensuring pos_terminals table:', error);
    throw error;
  }
}

// GET endpoint to fetch POS terminals
export async function GET(request: NextRequest) {
  try {
    await ensurePosTerminalsTable();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let sql = `
      SELECT
        id,
        ip_address AS ipAddress,
        terminal_description AS terminalDescription,
        serial_number AS serialNumber,
        min,
        permit_no AS permitNo,
        print_official_receipt AS printOfficialReceipt,
        or_next_reference AS orNextReference,
        inventory_location AS inventoryLocation,
        is_active AS isActive,
        created_at AS createdAt
      FROM pos_terminals
      WHERE 1=1
    `;
    const params: any[] = [];

    if (activeOnly) {
      sql += ' AND is_active = ?';
      params.push(true);
    }

    if (search) {
      sql += ' AND (terminal_description LIKE ? OR ip_address LIKE ? OR serial_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const terminals = await query(sql, params);

    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM pos_terminals WHERE 1=1';
    const countParams: any[] = [];

    if (activeOnly) {
      countSql += ' AND is_active = ?';
      countParams.push(true);
    }

    if (search) {
      countSql += ' AND (terminal_description LIKE ? OR ip_address LIKE ? OR serial_number LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countResult = await query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: terminals,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching POS terminals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch POS terminals' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a new POS terminal
export async function POST(request: NextRequest) {
  try {
    await ensurePosTerminalsTable();

    const body = await request.json();
    const {
      ipAddress,
      terminalDescription,
      serialNumber,
      min,
      permitNo,
      printOfficialReceipt,
      orNextReference,
      inventoryLocation,
      isActive = true
    } = body;

    // Generate ID
    const id = `terminal_${Date.now()}`;

    const sql = `
      INSERT INTO pos_terminals (
        id, ip_address, terminal_description, serial_number, min,
        permit_no, print_official_receipt, or_next_reference,
        inventory_location, is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await query(sql, [
      id,
      ipAddress?.trim() || null,
      terminalDescription?.trim() || null,
      serialNumber?.trim() || null,
      min?.trim() || null,
      permitNo?.trim() || null,
      printOfficialReceipt || 'No',
      orNextReference?.trim() || null,
      inventoryLocation || 'Store',
      isActive
    ]);

    return NextResponse.json({
      success: true,
      message: 'POS terminal created successfully',
      data: {
        id,
        ipAddress: ipAddress?.trim() || null,
        terminalDescription: terminalDescription?.trim() || null,
        serialNumber: serialNumber?.trim() || null,
        min: min?.trim() || null,
        permitNo: permitNo?.trim() || null,
        printOfficialReceipt: printOfficialReceipt || 'No',
        orNextReference: orNextReference?.trim() || null,
        inventoryLocation: inventoryLocation || 'Store',
        isActive
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating POS terminal:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to create POS terminal' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update a POS terminal
export async function PUT(request: NextRequest) {
  try {
    await ensurePosTerminalsTable();

    const body = await request.json();
    const {
      id,
      ipAddress,
      terminalDescription,
      serialNumber,
      min,
      permitNo,
      printOfficialReceipt,
      orNextReference,
      inventoryLocation,
      isActive
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Terminal ID is required' },
        { status: 400 }
      );
    }

    const sql = `
      UPDATE pos_terminals
      SET
        ip_address = ?,
        terminal_description = ?,
        serial_number = ?,
        min = ?,
        permit_no = ?,
        print_official_receipt = ?,
        or_next_reference = ?,
        inventory_location = ?,
        is_active = ?
      WHERE id = ?
    `;

    await query(sql, [
      ipAddress?.trim() || null,
      terminalDescription?.trim() || null,
      serialNumber?.trim() || null,
      min?.trim() || null,
      permitNo?.trim() || null,
      printOfficialReceipt || 'No',
      orNextReference?.trim() || null,
      inventoryLocation || 'Store',
      isActive !== undefined ? isActive : true,
      id
    ]);

    return NextResponse.json({
      success: true,
      message: 'POS terminal updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error updating POS terminal:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to update POS terminal' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a POS terminal
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Terminal ID is required' },
        { status: 400 }
      );
    }

    const sql = 'DELETE FROM pos_terminals WHERE id = ?';
    await query(sql, [id]);

    return NextResponse.json({
      success: true,
      message: 'POS terminal deleted successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error deleting POS terminal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete POS terminal' },
      { status: 500 }
    );
  }
}
