import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '../../../../../lib/mysql';
import { addFamilyStock, deductFamilyStock, findUltimateRoot } from '../../../../../lib/family-sync';

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
                    // --- Inventory Addition (Reversal) using recursive family sync ---
                    const { rootId, factorToRoot } = await findUltimateRoot(item.product_id, connection as any);
                    const quantityToAddInRootUnits = item.quantity / factorToRoot;
                    
                    await addFamilyStock(
                        rootId, 
                        quantityToAddInRootUnits, 
                        orderId, 
                        'adjustment', 
                        `Reversal of Sales Order: ${orderId}`, 
                        connection as any
                    );
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
            paymentReference,
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
                    const { rootId, factorToRoot } = await findUltimateRoot(item.product_id, connection as any);
                    const quantityToAddInRootUnits = item.quantity / factorToRoot;
                    
                    await addFamilyStock(
                        rootId, 
                        quantityToAddInRootUnits, 
                        orderId, 
                        'adjustment', 
                        `Update Reversal: ${orderId}`, 
                        connection as any
                    );
                }
            }

            // --- STEP 2: Delete Old Items ---
            await connection.query('DELETE FROM sales_order_items WHERE sales_order_id = ?', [orderId]);

            // --- STEP 3: Update Order Details ---
            const total = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
            
            const updateOrderQuery = `
                UPDATE sales_orders SET
                    customer_id = ?, order_date = ?, delivery_date = ?, reference = ?,
                    delivery_address = ?, total = ?, payment_method = ?, payment_reference = ?, status = ?,
                    shipping = ?, warehouse_id = ?, sales_person_id = ?, note = ?, updated_at = NOW()
                WHERE id = ?
            `;
            await connection.query(updateOrderQuery, [
                customer.id, formatDateForMySQL(orderDate), formatDateForMySQL(deliveryDate), reference || null,
                deliveryAddress || null, total, paymentMethod, paymentReference || null, status || 'Pending',
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

                // Inventory Deduction using recursive family sync
                const { rootId, factorToRoot } = await findUltimateRoot(item.product.id, connection as any);
                const quantityToDeductInRootUnits = item.quantity / factorToRoot;
                
                await deductFamilyStock(
                    rootId, 
                    quantityToDeductInRootUnits, 
                    orderId, 
                    'sale', 
                    `Update Deduction: ${orderId}`, 
                    connection as any
                );
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
