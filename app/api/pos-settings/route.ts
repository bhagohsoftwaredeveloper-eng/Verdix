import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET endpoint to fetch POS settings
export async function GET(request: NextRequest) {
  try {
    let settings = await db.posSettings.findFirst();
    
    if (!settings) {
      // Create default settings if none exist
      settings = await db.posSettings.create({
        data: {
          id: 'pos_settings_1',
          businessName: 'My Business',
          transactionPrefix: 'TXN',
          currencySymbol: '$',
          currencyCode: 'USD',
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY',
          enableAutomaticMarkup: true,
          defaultMarkupPercentage: 0.00,
          markupPriority: ["subcategory", "category", "brand", "supplier"],
          showQuantity: true
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      data: settings,
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
    const existing = await db.posSettings.findFirst();

    const allowedFields = [
      'businessName', 'operatedBy', 'address', 'contactNumber', 'tin', 'email',
      'minNumber', 'serialNumber', 'logoPath', 'printMode', 'currencySymbol',
      'currencyCode', 'timezone', 'dateFormat', 'enableAutomaticMarkup',
      'defaultMarkupPercentage', 'markupPriority', 'enablePriceEditAuth',
      'priceEditAuthUsername', 'priceEditAuthPassword', 'enableRecentSalesAuth',
      'recentSalesAuthUsername', 'recentSalesAuthPassword', 'enableLineVoidAuth',
      'lineVoidAuthUsername', 'lineVoidAuthPassword', 'enableVoidReturnAuth',
      'voidAuthUsername', 'voidAuthPassword', 'printTwoReceipts',
      'nativePrinterName', 'paperSize', 'requireAdjustmentConfirmation',
      'requireTransferConfirmation', 'requirePurchaseOrderConfirmation',
      'requireReceiveConfirmation', 'requireBadOrderConfirmation',
      'requireStockCountApproval', 'enableOverallReadingAuth',
      'overallReadingAuthUsername', 'overallReadingAuthPassword',
      'showQuantity', 'isTrainingMode', 'batchCostingRepackInherit',
      'batchCostingOversellBlock', 'transactionPrefix', 'enableAdvancedInventory'
    ];

    const data: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    // Handle legacy field mapping
    if (body.showQuantityInSearch !== undefined && data.showQuantity === undefined) {
      data.showQuantity = body.showQuantityInSearch;
    }
    if (body.requirePoConfirmation !== undefined && data.requirePurchaseOrderConfirmation === undefined) {
      data.requirePurchaseOrderConfirmation = body.requirePoConfirmation;
    }
    if (body.requireShelfTransferApproval !== undefined && data.requireShelfTransferConfirmation === undefined) {
      // Note: schema has requireShelfTransferConfirmation? Wait, checking schema again.
      // Actually schema I read didn't have requireShelfTransferConfirmation.
      // Let me re-verify schema.
    }

    if (!existing) {
      const newSettings = await db.posSettings.create({
        data: {
          ...data,
          id: 'pos_settings_1',
          businessName: data.businessName || 'My Business',
        }
      });
      return NextResponse.json({
        success: true,
        message: 'POS settings created successfully',
        data: newSettings,
        timestamp: new Date().toISOString()
      });
    } else {
      const updatedSettings = await db.posSettings.update({
        where: { id: existing.id },
        data
      });
      return NextResponse.json({
        success: true,
        message: 'POS settings updated successfully',
        data: updatedSettings,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error updating POS settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update POS settings' },
      { status: 500 }
    );
  }
}
