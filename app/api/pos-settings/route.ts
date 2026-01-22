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
        currency_symbol AS currencySymbol,
        currency_code AS currencyCode,
        timezone,
        date_format AS dateFormat,
        address,
        contact_number AS contactNumber,
        tin,
        email,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM pos_settings
      LIMIT 1
    `;
    
    const result = await query(sql);
    
    if (result.length === 0) {
      // Create default settings if none exist
      const insertSQL = `
        INSERT INTO pos_settings (id, business_name, enable_advanced_inventory, transaction_prefix, currency_symbol, currency_code, timezone, date_format)
        VALUES ('pos_settings_1', 'My Business', FALSE, 'TXN', '$', 'USD', 'UTC', 'MM/DD/YYYY')
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
    
    // Check if settings exist
    const checkSQL = 'SELECT id FROM pos_settings LIMIT 1';
    const existing = await query(checkSQL);

    if (existing.length === 0) {
      // Insert new settings (initial setup)
      const { 
        businessName, logoPath, enableAdvancedInventory, transactionPrefix, 
        address, contactNumber, tin, email,
        currencySymbol, currencyCode, timezone, dateFormat
      } = body;

      const insertSQL = `
        INSERT INTO pos_settings (
          id, business_name, logo_path, enable_advanced_inventory, transaction_prefix, 
          address, contact_number, tin, email,
          currency_symbol, currency_code, timezone, date_format
        )
        VALUES ('pos_settings_1', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await query(insertSQL, [
        businessName || 'My Business',
        logoPath || null,
        enableAdvancedInventory ?? false,
        transactionPrefix || 'TXN',
        address || null,
        contactNumber || null,
        tin || null,
        email || null,
        currencySymbol || '$',
        currencyCode || 'USD',
        timezone || 'UTC',
        dateFormat || 'MM/DD/YYYY'
      ]);
    } else {
      // Update existing settings - Dynamic Update
      const allowedFields: Record<string, string> = {
        businessName: 'business_name',
        logoPath: 'logo_path',
        enableAdvancedInventory: 'enable_advanced_inventory',
        transactionPrefix: 'transaction_prefix',
        address: 'address',
        contactNumber: 'contact_number',
        tin: 'tin',
        email: 'email',
        currencySymbol: 'currency_symbol',
        currencyCode: 'currency_code',
        timezone: 'timezone',
        dateFormat: 'date_format'
      };

      const updates: string[] = [];
      const values: any[] = [];

      for (const [key, val] of Object.entries(body)) {
        if (allowedFields[key] && val !== undefined) {
          updates.push(`${allowedFields[key]} = ?`);
          values.push(val);
        }
      }

      if (updates.length > 0) {
        const updateSQL = `UPDATE pos_settings SET ${updates.join(', ')} WHERE id = ?`;
        values.push(existing[0].id);
        await query(updateSQL, values);
      }
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
