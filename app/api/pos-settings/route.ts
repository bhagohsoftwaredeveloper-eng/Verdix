import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/mysql';

// GET endpoint to fetch POS settings
export async function GET(request: NextRequest) {
  try {
    // Ensure new columns exist (idempotent migration)
    await query(`ALTER TABLE pos_settings
      ADD COLUMN IF NOT EXISTS operated_by VARCHAR(255) NULL,
      ADD COLUMN IF NOT EXISTS min_number VARCHAR(100) NULL,
      ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100) NULL
    `).catch(() => {}); // Ignore error if columns already exist

    const sql = `
      SELECT
        id,
        business_name AS businessName,
        logo_path AS logoPath,
        transaction_prefix AS transactionPrefix,
        currency_symbol AS currencySymbol,
        currency_code AS currencyCode,
        timezone,
        date_format AS dateFormat,
        enable_automatic_markup AS enableAutomaticMarkup,
        default_markup_percentage AS defaultMarkupPercentage,
        markup_priority AS markupPriority,
        address,
        contact_number AS contactNumber,
        tin,
        email,
        created_at AS createdAt,
        updated_at AS updatedAt,
        enable_line_void_auth AS enableLineVoidAuth,
        line_void_auth_username AS lineVoidAuthUsername,
        line_void_auth_password AS lineVoidAuthPassword,
        enable_void_return_auth AS enableVoidReturnAuth,
        void_auth_username AS voidAuthUsername,
        void_auth_password AS voidAuthPassword,
        enable_return_auth AS enableReturnAuth,
        return_auth_username AS returnAuthUsername,
        return_auth_password AS returnAuthPassword,
        enable_recent_sales_auth AS enableRecentSalesAuth,
        recent_sales_auth_username AS recentSalesAuthUsername,
        recent_sales_auth_password AS recentSalesAuthPassword,
        paper_size AS paperSize,
        print_mode AS printMode,
        enable_negative_inventory AS enableNegativeInventory,
        enable_cash_count_auth AS enableCashCountAuth,
        cash_count_auth_username AS cashCountAuthUsername,
        cash_count_auth_password AS cashCountAuthPassword,
        show_quantity_in_search AS showQuantityInSearch,
        enable_price_edit_auth AS enablePriceEditAuth,
        price_edit_auth_username AS priceEditAuthUsername,
        price_edit_auth_password AS priceEditAuthPassword,
        operated_by AS operatedBy,
        min_number AS minNumber,
        serial_number AS serialNumber
      FROM pos_settings
      LIMIT 1
    `;
    
    const result = await query(sql);
    
    if (result.length === 0) {
      // Create default settings if none exist
      const insertSQL = `
        INSERT INTO pos_settings (id, business_name, transaction_prefix, currency_symbol, currency_code, timezone, date_format, enable_automatic_markup, default_markup_percentage, markup_priority, show_quantity_in_search)
        VALUES ('pos_settings_1', 'My Business', 'TXN', '$', 'USD', 'UTC', 'MM/DD/YYYY', TRUE, 0.00, '["subcategory", "category", "brand", "supplier"]', TRUE)
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
        businessName, logoPath, transactionPrefix, 
        address, contactNumber, tin, email,
        currencySymbol, currencyCode, timezone, dateFormat,
        enableAutomaticMarkup, defaultMarkupPercentage, markupPriority,
        enableLineVoidAuth, lineVoidAuthUsername, lineVoidAuthPassword,
        enableVoidReturnAuth, voidAuthUsername, voidAuthPassword,
        enableReturnAuth, returnAuthUsername, returnAuthPassword, // Fixed duplicate
        enableRecentSalesAuth, recentSalesAuthUsername, recentSalesAuthPassword,
        paperSize, printMode,
        enableNegativeInventory,
        enableCashCountAuth, cashCountAuthUsername, cashCountAuthPassword,
        showQuantityInSearch,
        enablePriceEditAuth, priceEditAuthUsername, priceEditAuthPassword
      } = body;

      const insertSQL = `
        INSERT INTO pos_settings (
          id, business_name, logo_path, transaction_prefix, 
          address, contact_number, tin, email,
          currency_symbol, currency_code, timezone, date_format,
          enable_automatic_markup, default_markup_percentage, markup_priority,
          enable_line_void_auth, line_void_auth_username, line_void_auth_password,
          enable_void_return_auth, void_auth_username, void_auth_password,
          enable_return_auth, return_auth_username, return_auth_password,
          enable_recent_sales_auth, recent_sales_auth_username, recent_sales_auth_password,
          paper_size, print_mode, enable_negative_inventory,
          enable_cash_count_auth, cash_count_auth_username, cash_count_auth_password,
          show_quantity_in_search,
          enable_price_edit_auth, price_edit_auth_username, price_edit_auth_password
        )
        VALUES ('pos_settings_1', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await query(insertSQL, [
        businessName || 'My Business',
        logoPath || null,
        transactionPrefix || 'TXN',
        address || null,
        contactNumber || null,
        tin || null,
        email || null,
        currencySymbol || '$',
        currencyCode || 'USD',
        timezone || 'UTC',
        dateFormat || 'MM/DD/YYYY',
        enableAutomaticMarkup ?? true,
        defaultMarkupPercentage || 0.00,
        markupPriority ? JSON.stringify(markupPriority) : JSON.stringify(["subcategory", "category", "brand", "supplier"]),
        enableLineVoidAuth ?? false,
        lineVoidAuthUsername || null,
        lineVoidAuthPassword || null,
        enableVoidReturnAuth ?? false,
        voidAuthUsername || null,
        voidAuthPassword || null,
        enableReturnAuth ?? false,
        returnAuthUsername || null,
        returnAuthPassword || null,
        enableRecentSalesAuth ?? false,
        recentSalesAuthUsername || null,
        recentSalesAuthPassword || null,
        paperSize || '58mm',
        printMode || 'browser',
        enableNegativeInventory ?? false,
        enableCashCountAuth ?? false,
        cashCountAuthUsername || null,
        cashCountAuthPassword || null,
        showQuantityInSearch ?? true,
        enablePriceEditAuth ?? false,
        priceEditAuthUsername || null,
        priceEditAuthPassword || null
      ]);
    } else {
      // Update existing settings - Dynamic Update
      const allowedFields: Record<string, string> = {
        businessName: 'business_name',
        logoPath: 'logo_path',
        transactionPrefix: 'transaction_prefix',
        address: 'address',
        contactNumber: 'contact_number',
        tin: 'tin',
        email: 'email',
        currencySymbol: 'currency_symbol',
        currencyCode: 'currency_code',
        timezone: 'timezone',
        dateFormat: 'date_format',
        enableAutomaticMarkup: 'enable_automatic_markup',
        defaultMarkupPercentage: 'default_markup_percentage',
        markupPriority: 'markup_priority',
        enableLineVoidAuth: 'enable_line_void_auth',
        lineVoidAuthUsername: 'line_void_auth_username',
        lineVoidAuthPassword: 'line_void_auth_password',
        enableVoidReturnAuth: 'enable_void_return_auth',
        voidAuthUsername: 'void_auth_username',
        voidAuthPassword: 'void_auth_password',
        enableReturnAuth: 'enable_return_auth',
        returnAuthUsername: 'return_auth_username',
        returnAuthPassword: 'return_auth_password',
        enableRecentSalesAuth: 'enable_recent_sales_auth',
        recentSalesAuthUsername: 'recent_sales_auth_username',
        recentSalesAuthPassword: 'recent_sales_auth_password',
        paperSize: 'paper_size',
        printMode: 'print_mode',
        enableNegativeInventory: 'enable_negative_inventory',
        enableCashCountAuth: 'enable_cash_count_auth',
        cashCountAuthUsername: 'cash_count_auth_username',
        cashCountAuthPassword: 'cash_count_auth_password',
        showQuantityInSearch: 'show_quantity_in_search',
        enablePriceEditAuth: 'enable_price_edit_auth',
        priceEditAuthUsername: 'price_edit_auth_username',
        priceEditAuthPassword: 'price_edit_auth_password',
        operatedBy: 'operated_by',
        minNumber: 'min_number',
        serialNumber: 'serial_number'
      };

      const updates: string[] = [];
      const values: any[] = [];

      for (const [key, val] of Object.entries(body)) {
        if (allowedFields[key] && val !== undefined) {
          updates.push(`${allowedFields[key]} = ?`);
          
          if (key === 'markupPriority' && Array.isArray(val)) {
             values.push(JSON.stringify(val));
          } else {
             values.push(val);
          }
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

