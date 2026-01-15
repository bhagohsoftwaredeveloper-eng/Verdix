import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

// GET endpoint to fetch POS settings
export async function GET(request: NextRequest) {
  try {
    const sql = `
      SELECT
        id,
        business_name AS businessName,
        logo_path AS logoPath,
        enable_advanced_inventory AS enableAdvancedInventory,
        transaction_prefix AS transactionPrefix,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM pos_settings
      LIMIT 1
    `;
    
    const result = await query(sql);
    
    if (result.length === 0) {
      // Create default settings if none exist
      const insertSQL = `
        INSERT INTO pos_settings (id, business_name, enable_advanced_inventory, transaction_prefix)
        VALUES ('pos_settings_1', 'My Business', FALSE, 'TXN')
      `;
      await query(insertSQL);
      
      // Fetch the newly created settings
      const newResult = await query(sql);
      return NextResponse.json({
        success: true,
        data: newResult[0],
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json({
      success: true,
      data: result[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching POS settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch POS settings' },
      { status: 500 }
    );
  }
}

// POST/PUT endpoint to update POS settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessName, logoPath, enableAdvancedInventory, transactionPrefix } = body;

    // Check if settings exist
    const checkSQL = 'SELECT id FROM pos_settings LIMIT 1';
    const existing = await query(checkSQL);

    if (existing.length === 0) {
      // Insert new settings
      const insertSQL = `
        INSERT INTO pos_settings (id, business_name, logo_path, enable_advanced_inventory, transaction_prefix)
        VALUES ('pos_settings_1', ?, ?, ?, ?)
      `;
      await query(insertSQL, [
        businessName || 'My Business',
        logoPath || null,
        enableAdvancedInventory ?? false,
        transactionPrefix || 'TXN'
      ]);
    } else {
      // Update existing settings
      const updateSQL = `
        UPDATE pos_settings
        SET business_name = ?,
            logo_path = ?,
            enable_advanced_inventory = ?,
            transaction_prefix = ?
        WHERE id = ?
      `;
      await query(updateSQL, [
        businessName,
        logoPath,
        enableAdvancedInventory,
        transactionPrefix,
        existing[0].id
      ]);
    }

    return NextResponse.json({
      success: true,
      message: 'POS settings updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating POS settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update POS settings' },
      { status: 500 }
    );
  }
}
