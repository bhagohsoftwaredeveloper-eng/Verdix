import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action is required' }, { status: 400 });
    }

    if (action === 'clear_sales') {
      await withTransaction(async (tx) => {
        const tablesToClear = [
          'pos_transaction_items',
          'pos_transactions',
          'payment_details',
          'payment_audit_log',
          'sale_items',
          'sales_transactions',
          'sales_order_items',
          'sales_orders',
          'sales_invoice_items',
          'sales_invoices',
          'customer_payments',
          'cash_transfers',
          'point_history',
          'bad_order_items',
          'bad_orders',
          'shifts',
          'x_readings',
          'z_readings'
        ];

        for (const table of tablesToClear) {
          try {
            await tx.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
          } catch (e) {
            console.log(`Table ${table} error or missing, skipping...`, e);
          }
        }
           
        // Clear approval queue items related to sales
        await tx.approvalQueue.deleteMany({
          where: {
            transactionType: { in: ['SALES_ORDER', 'SALES_INVOICE', 'BAD_ORDER'] }
          }
        });
        
        // Approval history cleanup is handled by Cascade in schema if defined, 
        // but let's be explicit if needed. 
        // In schema: approvalQueue ApprovalQueue @relation(fields: [approvalQueueId], references: [id], onDelete: Cascade)
        // So history will be deleted automatically.
      });

      return NextResponse.json({ success: true, message: 'Sales and transaction data cleared successfully' });

    } else if (action === 'reset_references') {
      await withTransaction(async (tx) => {
         await tx.$executeRawUnsafe('TRUNCATE TABLE "transaction_references" CASCADE');
         
         await tx.transactionReference.create({
            data: {
              id: 1,
              salesOrder: '1000',
              purchaseOrder: '1000',
              salesDelivery: '1000',
              paymentToSupplier: '1000',
              salesInvoice: '1000',
              customerPayment: '1000',
              deliveryReceipt: '1000',
              stockAdjustment: '1000',
              salesHold: '1000',
              receiptNumber: '00000001'
            }
         });

         // Also reset terminal counters
         await tx.posTerminal.updateMany({
           data: {
             orNextReference: '000001',
             xCounter: 0,
             zCounter: 0
           }
         });
      });

      return NextResponse.json({ success: true, message: 'Transaction references and terminal counters reset' });

    } else if (action === 'clear_inventory') {
      await withTransaction(async (tx) => {
        const tablesToClear = [
          'purchase_order_items',
          'purchase_orders',
          'supplier_payments',
          'stock_movements',
          'stock_adjustments',
          'stock_counts',
          'stock_count_items',
          'inventory_transfers',
          'inventory_transfer_items',
          'inventory_batches',
          'repackaging_logs',
          'product_price_levels',
          'supplier_product_mapping',
          'product_shelves',
          'conversion_factors'
        ];

        for (const table of tablesToClear) {
          try {
            await tx.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
          } catch (e) {
            console.log(`Table ${table} error or missing, skipping...`, e);
          }
        }

        await tx.$executeRawUnsafe('TRUNCATE TABLE "products" CASCADE');
        
        // Clear approval queue items related to inventory
        await tx.approvalQueue.deleteMany({
          where: {
            transactionType: { in: ['STOCK_ADJUSTMENT', 'STOCK_TRANSFER', 'PURCHASE_ORDER', 'RECEIVE_PO', 'SHELF_TRANSFER'] }
          }
        });
      });
      
      return NextResponse.json({ success: true, message: 'Inventory records and products cleared' });

    } else if (action === 'clear_master_data') {
      await withTransaction(async (tx) => {
        const tablesToClear = [
          'customers',
          'customer_loyalty',
          'suppliers',
          'categories',
          'brands',
          'subcategories',
          'units_of_measure',
          'shelf_locations',
          'departments',
          'sales_persons',
          'warehouses'
        ];

        for (const table of tablesToClear) {
          try {
            await tx.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
          } catch (e) {
            console.log(`Table ${table} error or missing, skipping...`, e);
          }
        }

        // Re-insert default STORE warehouse
        await tx.warehouse.upsert({
          where: { id: 'wh_main' },
          update: {
            name: 'STORE',
            location: 'Main Store',
            isActive: true
          },
          create: {
            id: 'wh_main',
            name: 'STORE',
            location: 'Main Store',
            isActive: true
          }
        });
      });

      return NextResponse.json({ success: true, message: 'Master data (Customers, Suppliers, Sales Persons, etc.) cleared' });

    } else if (action === 'factory_reset') {
      await withTransaction(async (tx) => {
        const allTables = [
          // Sales
          'pos_transaction_items', 'pos_transactions', 'payment_details', 'payment_audit_log',
          'sale_items', 'sales_transactions', 'sales_order_items', 'sales_orders',
          'sales_invoice_items', 'sales_invoices',
          'customer_payments', 'cash_transfers', 'point_history', 'bad_order_items', 'bad_orders',
          'shifts', 'x_readings', 'z_readings',
          // Inventory
          'purchase_order_items', 'purchase_orders', 'supplier_payments',
          'stock_movements', 'stock_adjustments', 'stock_counts', 'stock_count_items',
          'inventory_transfers', 'inventory_transfer_items', 'inventory_batches', 'repackaging_logs',
          'product_price_levels', 'supplier_product_mapping', 'product_shelves',
          'conversion_factors', 'products', 'warehouses',
          // Master Data
          'customers', 'customer_loyalty', 'loyalty_points_settings', 'suppliers', 'categories', 'brands', 'subcategories',
          'units_of_measure', 'shelf_locations', 'departments', 'sales_persons',
          // Approvals
          'approval_queue', 'approval_history', 'approval_workflows',
          // POS Setup & System configuration
          'pos_settings', 'pos_terminals', 'payment_methods', 'payment_terms', 'payment_term_types', 'price_levels' 
        ];

        for (const table of allTables) {
          try {
            await tx.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
          } catch (e) {
            console.log(`Table ${table} missing or could not be truncated, skipping...`, e);
          }
        }

        // 1. Reset POS Settings to defaults
        await tx.posSettings.create({
          data: {
            id: 'pos_settings_1',
            businessName: 'My Business',
            transactionPrefix: 'TXN',
            currencySymbol: '₱',
            currencyCode: 'PHP',
            timezone: 'Asia/Manila',
            dateFormat: 'MM/DD/YYYY',
            enableAutomaticMarkup: true,
            defaultMarkupPercentage: 0.00,
            markupPriority: ['subcategory', 'category', 'brand', 'supplier'],
            nativePrinterName: 'XP-58-P',
            paperSize: 'mm58' as any,
            printMode: 'browser' as any
          }
        });

        // 2. Insert default Payment Methods
        const defaultPaymentMethods = [
          { id: 'pm_cash', name: 'Cash', isActive: true },
          { id: 'pm_credit_card', name: 'Credit Card', isActive: true },
          { id: 'pm_bank_transfer', name: 'Bank Transfer', isActive: true },
          { id: 'pm_paypal', name: 'PayPal', isActive: true },
          { id: 'pm_gcash', name: 'GCash', isActive: true },
          { id: 'pm_check', name: 'Check', isActive: true }
        ];
        
        for (const pm of defaultPaymentMethods) {
          await tx.paymentMethod.create({ data: pm });
        }

        // 3. Insert default Price Level
        await tx.priceLevel.create({
          data: {
            id: 'retail-level',
            name: 'Retail',
            description: 'Standard retail price',
            isDefault: true,
            percentageAdjustment: 100.00
          }
        });

        // 4. Insert default STORE warehouse
        await tx.warehouse.upsert({
          where: { id: 'wh_main' },
          update: {
            name: 'STORE',
            location: 'Main Store',
            isActive: true
          },
          create: {
            id: 'wh_main',
            name: 'STORE',
            location: 'Main Store',
            isActive: true
          }
        });

        // User Management Reset (Keep Admin users)
        const adminRoles = await tx.userType.findMany({
          where: {
            name: { in: ['Admin', 'Super Admin'] }
          },
          select: { id: true }
        });
        
        const adminRoleIds = adminRoles.map(r => r.id);

        if (adminRoleIds.length > 0) {
          // 2. Delete permissions for non-admin users
          const nonAdminUsers = await tx.user.findMany({
            where: {
              NOT: [
                { userType: { in: adminRoleIds } },
                { username: 'admin' }
              ]
            },
            select: { uid: true }
          });
          const nonAdminUids = nonAdminUsers.map(u => u.uid);

          await tx.userPermission.deleteMany({
            where: {
              userUid: { in: nonAdminUids }
            }
          });
          
          // 3. Delete non-admin users
          await tx.user.deleteMany({
            where: {
              uid: { in: nonAdminUids }
            }
          });
        } else {
          // Fallback: Delete all users except 'admin' if roles can't be found
          const nonAdminUsers = await tx.user.findMany({
            where: {
              username: { not: 'admin' }
            },
            select: { uid: true }
          });
          const nonAdminUids = nonAdminUsers.map(u => u.uid);

          await tx.userPermission.deleteMany({
            where: {
              userUid: { in: nonAdminUids }
            }
          });
          await tx.user.deleteMany({
            where: {
              uid: { in: nonAdminUids }
            }
          });
          console.warn("Could not identify Admin roles, using username fallback to preserve 'admin' account.");
        }

        // Reset references
        await tx.$executeRawUnsafe('TRUNCATE TABLE "transaction_references" CASCADE');
        await tx.transactionReference.create({
          data: {
            id: 1,
            salesOrder: '1000',
            purchaseOrder: '1000',
            salesDelivery: '1000',
            paymentToSupplier: '1000',
            salesInvoice: '1000',
            customerPayment: '1000',
            deliveryReceipt: '1000',
            stockAdjustment: '1000',
            salesHold: '1000',
            receiptNumber: '00000001'
          }
        });

      });

      return NextResponse.json({ success: true, message: 'System fully reset to initial state including POS setup' });

    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error in reset API:', error);
    return NextResponse.json({ success: false, error: error.message || 'An error occurred' }, { status: 500 });
  }
}
