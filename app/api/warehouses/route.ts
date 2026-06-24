import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../../../lib/mysql';
import { MySqlWarehouseRepository } from '../../../src/infrastructure/repositories/MySqlWarehouseRepository';
import { GetWarehousesUseCase } from '../../../src/core/warehouses/application/GetWarehousesUseCase';

// Initialize dependencies
const warehouseRepository = new MySqlWarehouseRepository();
const getWarehousesUseCase = new GetWarehousesUseCase(warehouseRepository);

async function ensureWarehousesTable() {
  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS warehouses (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        location VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    
    await query(createTableSQL);

    // Add missing columns if table already exists
    const columns = [
      { name: 'contact_number', type: 'VARCHAR(100)' },
      { name: 'active', type: 'BOOLEAN DEFAULT TRUE' },
      { name: 'is_main', type: 'BOOLEAN DEFAULT FALSE' }
    ];

    // Get current columns
    const currentColumnsResult = await query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'warehouses' AND TABLE_SCHEMA = DATABASE()"
    );
    const existingColumns = new Set(currentColumnsResult.map((c: any) => c.COLUMN_NAME));

    for (const col of columns) {
      if (!existingColumns.has(col.name)) {
        try {
          await query(`ALTER TABLE warehouses ADD COLUMN ${col.name} ${col.type}`);
          console.log(`✅ Added missing column ${col.name} to warehouses table`);
        } catch (e: any) {
          console.error(`Error adding column ${col.name}:`, e.message);
        }
      }
    }

    // Migration: If 'active' was just added but 'is_active' exists, sync values
    if (existingColumns.has('is_active') && !existingColumns.has('active')) {
        // Wait, the previous loop already added 'active' if it was missing.
        // So we can check if we just added it.
    }
    
    // Always try to sync is_active to active if both exist
    const updatedColumnsResult = await query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'warehouses' AND TABLE_SCHEMA = DATABASE()"
    );
    const updatedColumns = new Set(updatedColumnsResult.map((c: any) => c.COLUMN_NAME));
    
    if (updatedColumns.has('is_active') && updatedColumns.has('active')) {
        await query('UPDATE warehouses SET active = is_active WHERE active IS NULL OR active = TRUE');
        console.log('✅ Synced is_active to active in warehouses table');
    }

  } catch (error) {
    console.error('Error ensuring warehouses table:', error);
    throw error;
  }
}

export async function GET() {
  try {
    await ensureWarehousesTable();
    const warehouses = await getWarehousesUseCase.execute();

    return NextResponse.json({
      success: true,
      data: warehouses,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch warehouses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureWarehousesTable();
    const body = await request.json();
    const { name, location, contactNumber, active = true, isMain = false } = body;
    let { id } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!id) {
      id = `wh_${uuidv4().substring(0, 8)}`;
    }

    const warehouseId = await warehouseRepository.create({
      id, name, location, contactNumber, active, isMain
    });

    return NextResponse.json({
      success: true,
      message: 'Warehouse created successfully',
      data: { id: warehouseId, name },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating warehouse:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create warehouse' },
      { status: 500 }
    );
  }
}
