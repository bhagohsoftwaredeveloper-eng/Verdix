import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '../../../../../lib/mysql';

// Helper function to format ISO date strings to MySQL format
function formatDateForMySQL(dateValue: string | null | undefined): string | null {
    if (!dateValue) return null;
    try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return null;
        // Format as YYYY-MM-DD HH:MM:SS
        return date.toISOString().slice(0, 19).replace('T', ' ');
    } catch {
        return null;
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } | Promise<{ id: string }> }
) {
    const resolvedParams = params instanceof Promise ? await params : params;
    const orderId = resolvedParams.id;

    try {
        return await withTransaction(async (connection) => {
            // 1. Fetch items to reverse stock
            const [items]: any = await connection.query('SELECT product_id, quantity FROM sales_order_items WHERE sales_order_id = ?', [orderId]);

            if (items && items.length > 0) {
                for (const item of items) {
                    // --- Inventory Addition (Reversal) ---
                    const [soldProds]: any = await connection.query('SELECT id, parent_id, unit_of_measure, name, stock FROM products WHERE id = ?', [item.product_id]);

                    if (soldProds && soldProds.length > 0) {
                        const soldProd = soldProds[0];
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

                        // 3. Define the "Anchor" new stock (Reversal: add back quantity)
                        const anchorPreviousStock = soldProd.stock;
                        const anchorNewStock = anchorPreviousStock + item.quantity;

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
                                    // Record stock movement (Reversal)
                                    const movementId = `mov_so_rev_${Date.now()}_${member.id.substr(-4)}_${Math.random().toString(36).substr(2, 4)}`;
                                    await connection.query(`
                                        INSERT INTO stock_movements (
                                            id, product_id, product_name, movement_type, 
                                            quantity_change, previous_stock, new_stock, 
                                            reference_id, reference_type, notes, created_at, updated_at
                                        ) VALUES (?, ?, ?, 'adjustment', ?, ?, ?, ?, 'sales_order', ?, NOW(), NOW())
                                    `, [
                                        movementId,
                                        member.id,
                                        member.name,
                                        quantityChange,
                                        currentStock,
                                        newStock,
                                        orderId,
                                        `Reversal of Sales Order: ${orderId} (Sync from Anchor: ${soldProd.name})`
                                    ]);

                                    // Update product stock
                                    await connection.query('UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?', [newStock, member.id]);
                                }
                            }
                        }
                    }
                }
            }

            // 2. Delete items
            await connection.query('DELETE FROM sales_order_items WHERE sales_order_id = ?', [orderId]);

            // 3. Delete order
            await connection.query('DELETE FROM sales_orders WHERE id = ?', [orderId]);

            return NextResponse.json({
                success: true,
                message: 'Sales order deleted and stock reversed successfully'
            });
        });
    } catch (error) {
        console.error('Error deleting sales order:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete sales order' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } | Promise<{ id: string }> }
) {
    const resolvedParams = params instanceof Promise ? await params : params;
    const orderId = resolvedParams.id;

    try {
        const body = await request.json();
        const {
            customer,
            orderDate,
            deliveryDate,
            reference,
            deliveryAddress,
            paymentMethod,
            status,
            shipping,
            warehouse,
            salesPerson,
            note,
            items
        } = body;

        return await withTransaction(async (connection) => {
            // --- STEP 1: Inventory Reversal for Existing Items (Logic reused from DELETE) ---
            const [oldItems]: any = await connection.query('SELECT product_id, quantity FROM sales_order_items WHERE sales_order_id = ?', [orderId]);

            if (oldItems && oldItems.length > 0) {
                for (const item of oldItems) {
                     const [soldProds]: any = await connection.query('SELECT id, parent_id, unit_of_measure, name, stock FROM products WHERE id = ?', [item.product_id]);
                     if (soldProds && soldProds.length > 0) {
                        const soldProd = soldProds[0];
                        const rootId = soldProd.parent_id || soldProd.id;
                        const [familyMembers]: any = await connection.query(`SELECT id, unit_of_measure, name, stock FROM products WHERE id = ? OR parent_id = ?`, [rootId, rootId]);
                        const [convFactors]: any = await connection.query('SELECT unit, factor FROM conversion_factors WHERE product_id = ?', [soldProd.id]);
                        const factorMap = new Map();
                        convFactors.forEach((cf: any) => factorMap.set(cf.unit, parseFloat(cf.factor)));
                        factorMap.set(soldProd.unit_of_measure, 1);

                        const anchorPreviousStock = soldProd.stock;
                        const anchorNewStock = anchorPreviousStock + item.quantity; // Add back

                        for (const member of familyMembers) {
                            let factor = factorMap.get(member.unit_of_measure);
                            if (factor !== undefined) {
                                const currentStock = member.stock;
                                const newStock = Math.floor(anchorNewStock * factor);
                                const quantityChange = newStock - currentStock;

                                if (quantityChange !== 0 || member.id === soldProd.id) {
                                    const movementId = `mov_so_upd_rev_${Date.now()}_${member.id.substr(-4)}_${Math.random().toString(36).substr(2, 4)}`;
                                    await connection.query(`
                                        INSERT INTO stock_movements (
                                            id, product_id, product_name, movement_type, 
                                            quantity_change, previous_stock, new_stock, 
                                            reference_id, reference_type, notes, created_at, updated_at
                                        ) VALUES (?, ?, ?, 'adjustment', ?, ?, ?, ?, 'sales_order', ?, NOW(), NOW())
                                    `, [movementId, member.id, member.name, quantityChange, currentStock, newStock, orderId, `Update Reversal: ${orderId} (Anchor: ${soldProd.name})`]);
                                    await connection.query('UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?', [newStock, member.id]);
                                }
                            }
                        }
                     }
                }
            }

            // --- STEP 2: Delete Old Items ---
            await connection.query('DELETE FROM sales_order_items WHERE sales_order_id = ?', [orderId]);

            // --- STEP 3: Update Order Details ---
            const total = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
            
            const updateOrderQuery = `
                UPDATE sales_orders SET
                    customer_id = ?, order_date = ?, delivery_date = ?, reference = ?,
                    delivery_address = ?, total = ?, payment_method = ?, status = ?,
                    shipping = ?, warehouse_id = ?, sales_person_id = ?, note = ?, updated_at = NOW()
                WHERE id = ?
            `;
            await connection.query(updateOrderQuery, [
                customer.id, formatDateForMySQL(orderDate), formatDateForMySQL(deliveryDate), reference || null,
                deliveryAddress || null, total, paymentMethod, status || 'Pending',
                shipping || 0, warehouse || null, salesPerson || null, note || null, 
                orderId
            ]);

            // --- STEP 4: Insert New Items & Deduct Stock (Reuse POST logic) ---
             const insertItemQuery = `
                INSERT INTO sales_order_items (
                  id, sales_order_id, product_id, product_name, quantity, price
                ) VALUES (?, ?, ?, ?, ?, ?)
              `;

              for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const itemId = `SOI-${Date.now()}-${i + 1}-${Math.random().toString(36).substr(2, 5)}`;

                await connection.query(insertItemQuery, [itemId, orderId, item.product.id, item.product.name, item.quantity, item.price]);

                // Inventory Deduction
                const [soldProdResult]: any = await connection.query('SELECT id, parent_id, unit_of_measure, name, stock FROM products WHERE id = ?', [item.product.id]);
                if (soldProdResult && soldProdResult.length > 0) {
                  const soldProd = soldProdResult[0];
                  const rootId = soldProd.parent_id || soldProd.id;
                  const [familyMembers]: any = await connection.query(`SELECT id, unit_of_measure, name, stock FROM products WHERE id = ? OR parent_id = ?`, [rootId, rootId]);
                  const [convFactors]: any = await connection.query('SELECT unit, factor FROM conversion_factors WHERE product_id = ?', [soldProd.id]);
                  const factorMap = new Map();
                  convFactors.forEach((cf: any) => factorMap.set(cf.unit, parseFloat(cf.factor)));
                  factorMap.set(soldProd.unit_of_measure, 1);

                  const anchorPreviousStock = soldProd.stock;
                  const anchorNewStock = anchorPreviousStock - item.quantity; // Deduct

                  for (const member of familyMembers) {
                    let factor = factorMap.get(member.unit_of_measure);
                    if (factor !== undefined) {
                      const currentStock = member.stock;
                      const newStock = Math.floor(anchorNewStock * factor);
                      const quantityChange = newStock - currentStock;

                      if (quantityChange !== 0 || member.id === soldProd.id) {
                        const movementId = `mov_so_upd_ded_${Date.now()}_${i}_${member.id.substr(-4)}`;
                        await connection.query(`
                                    INSERT INTO stock_movements (
                                        id, product_id, product_name, movement_type, 
                                        quantity_change, previous_stock, new_stock, 
                                        reference_id, reference_type, notes, created_at, updated_at
                                    ) VALUES (?, ?, ?, 'sales_order', ?, ?, ?, ?, 'sales_order', ?, NOW(), NOW())
                                `, [movementId, member.id, member.name, quantityChange, currentStock, newStock, orderId, `Update Deduction: ${orderId} (Anchor: ${soldProd.name})`]);
                        await connection.query('UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?', [newStock, member.id]);
                      }
                    }
                  }
                }
              }

            return NextResponse.json({
                success: true,
                message: 'Sales order updated successfully',
                data: { id: orderId }
            });
        });
    } catch (error) {
        console.error('Error updating sales order:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update sales order' },
            { status: 500 }
        );
    }
}
