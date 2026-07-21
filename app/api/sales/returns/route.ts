import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/mysql';
import { addFamilyStock, findUltimateRoot } from '@/lib/family-sync';
import { saveEJournalFiles } from '@/lib/ejournal/ejournal-writer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      saleId,
      items, // Array of { productId, productName, quantity, price }
      terminalId,
      userId,
      reason,
      totalAmount
    } = body;

    if (!saleId || !items || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Sale ID and items are required' }, { status: 400 });
    }

    const result = await withTransaction(async (connection) => {
      // Find a valid user ID if none provided (last resort to avoid FK error)
      let finalUserId = userId;
      if (!finalUserId) {
        const [userResult]: any = await connection.query('SELECT uid FROM users LIMIT 1');
        finalUserId = userResult?.[0]?.uid || 'system'; // 'system' might still fail if not in users
      }

      const posTransId = `RTN-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      // 1. Insert into pos_transactions
      const insertPosTransSql = `
        INSERT INTO pos_transactions (
          id, sale_id, user_id, terminal_id, transaction_type,
          subtotal, tax_amount, discount_amount, total_amount, payment_method, 
          payment_status, notes, transaction_time, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'return', ?, 0, 0, ?, 'Return', 'completed', ?, NOW(), NOW(), NOW())
      `;
      
      await connection.query(insertPosTransSql, [
        posTransId,
        saleId,
        finalUserId,
        terminalId || null,
        -totalAmount, // Negative since it's a return/outflow of money from business
        -totalAmount,
        reason || 'Merchandise Credit'
      ]);

      const insertItemSql = `
        INSERT INTO pos_transaction_items (
          id, pos_transaction_id, sale_item_id, product_id, product_name, 
          quantity, unit_price, line_total, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      // First, create sale_items for this return transaction
      const insertSaleItemSql = `
        INSERT INTO sale_items (
          id, sale_id, product_id, product_name, quantity, price, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      `;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const saleItemId = `${posTransId}-ITEM-${i + 1}`;
        const posItemId = `${posTransId}-DETAIL-${i + 1}`;

        // Create sale_item entry
        await connection.query(insertSaleItemSql, [
          saleItemId,
          saleId,
          item.productId,
          item.productName,
          -item.quantity, // Negative for returns
          item.price
        ]);

        // Create pos_transaction_item entry referencing the sale_item
        await connection.query(insertItemSql, [
          posItemId,
          posTransId,
          saleItemId, // Reference the sale_item we just created
          item.productId,
          item.productName,
          -item.quantity, // Negative quantity
          item.price,
          -(item.quantity * item.price)
        ]);

        // --- Recursive Inventory Addition (Full Ancestor + Descendant Hierarchy) ---
        const [soldProdResult]: any = await connection.query(
          'SELECT id, parent_id, unit_of_measure, name, stock FROM products WHERE id = ?',
          [item.productId]
        );
        
        if (soldProdResult && soldProdResult.length > 0) {
          const soldProd = soldProdResult[0];

          // Walk ALL the way up the ancestor chain
          const { rootId, factorToRoot } = await findUltimateRoot(soldProd.id, connection);

          if (factorToRoot > 1 || rootId !== soldProd.id) {
            // Returned a child - convert to root units and add from root downward
            const rootQty = Number(item.quantity) / factorToRoot;
            await addFamilyStock(
              rootId, rootQty, posTransId, 'return',
              `Return for Sale: ${saleId} (returned: ${soldProd.name})`, connection
            );
          } else {
            // Returned a root - add and propagate
            await addFamilyStock(
              soldProd.id, Number(item.quantity), posTransId, 'return',
              `Return for Sale: ${saleId}`, connection
            );
          }
        }
      }

      // 3. Update original sale status if needed (Optional: could mark as 'Returned' or keep it as 'Paid' but has return links)
      // For now, let's keep it simple and just record the return transaction.
      // The returns page looks for transaction_type = 'return'.

      const [meta]: any = await connection.query(
        `SELECT DATE(transaction_time) AS d, terminal_id AS t FROM pos_transactions WHERE id = ? LIMIT 1`,
        [posTransId]
      );
      const d = meta?.[0]?.d ? String(meta[0].d) : null;
      const t = meta?.[0]?.t ?? 'all';

      return { posTransId, d, t };
    });

    if (result.d) {
      saveEJournalFiles(result.d, result.t).catch((e) => console.error('e-journal auto-save failed:', e));
    }

    return NextResponse.json({
      success: true,
      data: { posTransId: result.posTransId },
      message: 'Return processed successfully'
    });

  } catch (error: any) {
    console.error('Error processing return:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process return' },
      { status: 500 }
    );
  }
}
