import { NextRequest, NextResponse } from 'next/server';
import { withTransaction, query, getNextReference, getNextReceiptNumber } from '../../../lib/mysql';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customer,
      invoiceDate,
      dueDate,
      reference,
      deliveryAddress,
      paymentMethod,
      paymentReference,
      status = 'Pending',
      shipping = 0,
      warehouse,
      salesPerson,
      depositAccount,
      note,
      items,
    } = body;

    if (!customer || !customer.id || !invoiceDate || !paymentMethod || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer, invoice date, payment method, and items are required' },
        { status: 400 }
      );
    }

    // Generate unique invoice ID
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate total
    const total = items.reduce((acc: number, item: any) => {
      return acc + (item.price * item.quantity);
    }, 0) + shipping;

    // Start transaction
    try {
      return await withTransaction(async (connection) => {
        // Insert into sales_invoices table
        const insertInvoiceSql = `
          INSERT INTO sales_invoices (
            id, customer_id, reference, receipt_number, invoice_date, due_date, total, payment_method,
            payment_reference, status, transaction_source, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Backoffice', ?, NOW(), NOW())
        `;

        // Generate sequential reference if not provided
        let finalReference = reference;
        if (!finalReference || finalReference.trim() === '') {
          const nextVal = await getNextReference('sales_invoice');
          finalReference = `INV-${nextVal.toString().padStart(6, '0')}`;
        }

        // Generate sequential receipt number (OR)
        const receiptNumber = await getNextReceiptNumber();

        await connection.query(insertInvoiceSql, [
          invoiceId,
          customer.id,
          finalReference,
          receiptNumber,
          invoiceDate,
          (dueDate && dueDate.trim() !== '') ? dueDate : null,
          total,
          paymentMethod,
          paymentReference || null,
          status,
          note || null,
        ]);

        // Insert invoice items
        const insertItemSql = `
          INSERT INTO sales_invoice_items (
            id, sales_invoice_id, product_id, product_name, quantity, price, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const itemId = `${invoiceId}_item_${i + 1}`;

          await connection.query(insertItemSql, [
            itemId,
            invoiceId,
            item.product.id,
            item.product.name,
            item.quantity,
            item.price,
          ]);

          // --- Inventory Check Logic ---
          // Fetch POS settings to see if negative inventory is allowed
          const [settingsResult]: any = await connection.query('SELECT enable_negative_inventory FROM pos_settings LIMIT 1');
          const enableNegativeInventory = settingsResult.length > 0 ? !!settingsResult[0].enable_negative_inventory : false;

          if (!enableNegativeInventory) {
              // Check stock for the item
              const [stockResult]: any = await connection.query('SELECT stock, name FROM products WHERE id = ?', [item.product.id]);
              if (stockResult && stockResult.length > 0) {
                  const currentStock = stockResult[0].stock;
                  if (currentStock < item.quantity) {
                       throw new Error(`Insufficient stock for product: ${stockResult[0].name}. Current stock: ${currentStock}, Requested: ${item.quantity}`);
                  }
              }
          }

          // --- Anchor-Based Inventory Deduction & Sync ---
          // Fetch sold product details to identify family
          const [soldProdResult]: any = await connection.query('SELECT id, parent_id, unit_of_measure, name, stock FROM products WHERE id = ?', [item.product.id]);
          if (soldProdResult && soldProdResult.length > 0) {
            const soldProd = soldProdResult[0];
            const rootId = soldProd.parent_id || soldProd.id;

            // 1. Identify Product Family (Root + all children)
            const [familyMembers]: any = await connection.query(`
                  SELECT id, unit_of_measure, name, stock 
                  FROM products 
                  WHERE id = ? OR parent_id = ?
              `, [rootId, rootId]);

            // 2. Fetch conversion factors relative to the SOLD product (our anchor)
            const [convFactors]: any = await connection.query('SELECT unit, factor FROM conversion_factors WHERE product_id = ?', [soldProd.id]);
            const factorMap = new Map();
            convFactors.forEach((cf: any) => factorMap.set(cf.unit, parseFloat(cf.factor)));
            factorMap.set(soldProd.unit_of_measure, 1);

            // 3. Define the "Anchor" new stock
            const anchorPreviousStock = soldProd.stock;
            const anchorNewStock = anchorPreviousStock - item.quantity;

            // 4. Force-update all family members based on the anchor's new state
            for (const member of familyMembers) {
              let factor = factorMap.get(member.unit_of_measure);
              if (factor !== undefined) {
                const currentStock = member.stock;
                // Core fix: calculate new stock from anchor to avoid rounding drift
                const newStock = Math.floor(anchorNewStock * factor);
                const quantityChange = newStock - currentStock;

                // Only record and update if there's a change or it's the anchor
                if (quantityChange !== 0 || member.id === soldProd.id) {
                  // Record stock movement for each member
                  const movementId = `mov_${Date.now()}_${i}_${member.id.substr(-4)}_${Math.random().toString(36).substr(2, 5)}`;
                  const insertMovementSql = `
                            INSERT INTO stock_movements (
                                id, product_id, product_name, movement_type, 
                                quantity_change, previous_stock, new_stock, 
                                reference_id, reference_type, notes, created_at, updated_at
                            ) VALUES (?, ?, ?, 'sale', ?, ?, ?, ?, 'sale', ?, NOW(), NOW())
                        `;

                  await connection.query(insertMovementSql, [
                    movementId,
                    member.id,
                    member.name,
                    quantityChange,
                    currentStock,
                    newStock,
                    invoiceId,
                    `Sales Invoice: ${reference || invoiceId} (Sync from Anchor: ${soldProd.name})`
                  ]);

                  // Update product stock
                  await connection.query('UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?', [newStock, member.id]);
                }
              }
            }
          }
        }

        return NextResponse.json({
          success: true,
          message: 'Sales invoice created successfully',
          data: {
            id: invoiceId,
            customer,
            invoiceDate,
            dueDate,
            total,
            paymentMethod,
            status,
            items,
          },
          timestamp: new Date().toISOString()
        });
      });
    } catch (error: any) {
      console.error('Error creating sales invoice:', error);
      if (error.message && error.message.includes('Insufficient stock')) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: `Failed to create sales invoice: ${error instanceof Error ? error.message : String(error)}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating sales invoice:', error);
    return NextResponse.json(
      { success: false, error: `Failed to create sales invoice: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('countOnly') === 'true';
    const warehouse = searchParams.get('warehouse');

    // Handle countOnly requests (for warehouse dependency checks)
    if (countOnly && warehouse) {
      const countQuery = `
        SELECT COUNT(*) as total
        FROM sales_transactions
        WHERE warehouse = ?
      `;
      const countResult = await query(countQuery, [warehouse]);
      return NextResponse.json({
        success: true,
        total: countResult[0]?.total || 0,
        timestamp: new Date().toISOString()
      });
    }

    // Query to fetch all sales invoices from sales_invoices table only
    const invoicesQuery = `
      SELECT
        si.id,
        si.customer_id,
        si.reference,
        si.receipt_number,
        c.name as customer_name,
        c.contact_number as customer_contact,
        c.payment_terms as customer_payment_terms,
        si.invoice_date,
        si.due_date,
        si.total,
        si.payment_method,
        si.payment_reference,
        si.status,
        si.transaction_source,
        si.notes,
        si.created_at,
        si.updated_at,
        pt.order_number
      FROM sales_invoices si
      LEFT JOIN customers c ON si.customer_id = c.id
      LEFT JOIN sales_transactions st ON si.reference = st.reference AND si.reference IS NOT NULL AND si.reference != ''
      LEFT JOIN pos_transactions pt ON st.id = pt.sale_id
      ORDER BY si.created_at DESC
    `;

    const salesInvoicesRaw: any[] = await query(invoicesQuery);
    
    // Deduplicate in JS to prevent React duplicate key errors and process faster
    const uniqueSalesInvoicesMap = new Map();
    for (const row of salesInvoicesRaw) {
      if (!uniqueSalesInvoicesMap.has(row.id)) {
        uniqueSalesInvoicesMap.set(row.id, row);
      } else {
        const existing = uniqueSalesInvoicesMap.get(row.id);
        if (!existing.order_number && row.order_number) {
          existing.order_number = row.order_number;
        }
      }
    }
    const salesInvoices = Array.from(uniqueSalesInvoicesMap.values());
    
    console.log('Sales invoices found in sales_invoices table (unique):', salesInvoices.length);

    // Batch fetch items for all invoices to avoid N+1 queries
    let allItems: any[] = [];
    if (salesInvoices.length > 0) {
      const invoiceIds = salesInvoices.map((inv: any) => inv.id);
      const placeholders = invoiceIds.map(() => '?').join(',');
      const itemsQuery = `
        SELECT
          sii.id,
          sii.sales_invoice_id,
          sii.product_id,
          sii.product_name,
          p.sku,
          p.barcode,
          sii.quantity,
          sii.price
        FROM sales_invoice_items sii
        LEFT JOIN products p ON sii.product_id = p.id
        WHERE sii.sales_invoice_id IN (${placeholders})
        ORDER BY sii.created_at ASC
      `;
      allItems = await query(itemsQuery, invoiceIds);
    }

    // Group items by invoice ID
    const itemsByInvoice: Record<string, any[]> = {};
    allItems.forEach((item: any) => {
      if (!itemsByInvoice[item.sales_invoice_id]) {
        itemsByInvoice[item.sales_invoice_id] = [];
      }
      itemsByInvoice[item.sales_invoice_id].push({
        product: {
          id: item.product_id,
          name: item.product_name,
          sku: item.sku || '',
          barcode: item.barcode || '',
          price: parseFloat(item.price),
        },
        quantity: parseInt(item.quantity),
        price: parseFloat(item.price),
      });
    });

    // Map items back to invoices
    const invoicesWithItems = salesInvoices.map((row: any) => {
      return {
        id: row.id,
        reference: row.reference,
        receiptNo: row.receipt_number,
        transactionSource: row.transaction_source,
        customer: {
          id: row.customer_id || '',
          name: row.customer_name || 'Walk-in Customer',
          contactNumber: row.customer_contact || '',
          paymentTerms: row.customer_payment_terms || '',
        },
        invoiceDate: row.invoice_date,
        dueDate: row.due_date,
        total: parseFloat(row.total),
        paymentMethod: row.payment_method || '',
        paymentReference: row.payment_reference || '',
        status: row.status as 'Paid' | 'Pending' | 'Failed' | 'Shipped' | 'Delivered' | 'Returned',
        notes: row.notes,
        orderNumber: row.order_number,
        items: itemsByInvoice[row.id] || [],
      };
    });

    return NextResponse.json({
      success: true,
      data: invoicesWithItems,
      count: invoicesWithItems.length,
      source: 'sales_invoices'
    });
  } catch (error) {
    console.error('Error fetching sales invoices:', error);
    return NextResponse.json(
      { success: false, error: `Failed to fetch sales invoices: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
