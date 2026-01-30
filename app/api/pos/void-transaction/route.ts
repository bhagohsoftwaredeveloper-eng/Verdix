import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/lib/mysql';

export async function POST(request: NextRequest) {
    try {
        const { saleId } = await request.json();
        console.log('void-transaction: Received saleId:', saleId);

        if (!saleId) {
            return NextResponse.json({ success: false, error: 'Sale ID is required' }, { status: 400 });
        }

        return await withTransaction(async (connection: any) => {
            // 1. Fetch sales transaction to check status
            const [sale]: any = await connection.query('SELECT id, status FROM sales_transactions WHERE id = ?', [saleId]);
            console.log('void-transaction: Found sale:', sale);

            if (!sale || sale.length === 0) {
                return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
            }

            if (sale[0].status === 'voided') {
                return NextResponse.json({ success: false, error: 'Transaction is already voided' }, { status: 400 });
            }

            // 2. Fetch items to reverse stock
            const [items]: any = await connection.query('SELECT product_id, product_name, quantity FROM sale_items WHERE sale_id = ?', [saleId]);
            console.log('void-transaction: Found items:', items?.length || 0);

            if (items && items.length > 0) {
                for (const item of items) {
                    // --- Inventory Addition (Reversal) ---
                    const [soldProds]: any = await connection.query('SELECT id, parent_id, unit_of_measure, name, stock FROM products WHERE id = ?', [item.product_id]);

                    if (soldProds && soldProds.length > 0) {
                        const soldProd = soldProds[0];
                        const rootId = soldProd.parent_id || soldProd.id;

                        // Identify Product Family (Root + all children)
                        const [familyMembers]: any = await connection.query(`
                            SELECT id, unit_of_measure, name, stock 
                            FROM products 
                            WHERE id = ? OR parent_id = ?
                        `, [rootId, rootId]);

                        // Fetch conversion factors relative to the SOLD product (our anchor)
                        const [convFactors]: any = await connection.query('SELECT unit, factor FROM conversion_factors WHERE product_id = ?', [soldProd.id]);
                        const factorMap = new Map();
                        if (convFactors && convFactors.length > 0) {
                            convFactors.forEach((cf: any) => factorMap.set(cf.unit, parseFloat(cf.factor)));
                        }
                        factorMap.set(soldProd.unit_of_measure, 1);

                        // Define the "Anchor" new stock (Reversal: add back quantity)
                        const anchorPreviousStock = soldProd.stock;
                        const anchorNewStock = anchorPreviousStock + item.quantity;

                        // Force-update all family members based on the anchor's new state
                        for (const member of familyMembers) {
                            let factor = factorMap.get(member.unit_of_measure);
                            if (factor !== undefined) {
                                const currentStock = member.stock;
                                const newStock = Math.floor(anchorNewStock * factor);
                                const quantityChange = newStock - currentStock;

                                if (quantityChange !== 0 || member.id === soldProd.id) {
                                    // Record stock movement (Reversal)
                                    const memberId = String(member.id);
                                    const movementId = `mov_void_${Date.now()}_${memberId.slice(-4)}_${Math.random().toString(36).slice(2, 6)}`;
                                    await connection.query(`
                                        INSERT INTO stock_movements (
                                            id, product_id, product_name, movement_type, 
                                            quantity_change, previous_stock, new_stock, 
                                            reference_id, reference_type, notes, created_at, updated_at
                                        ) VALUES (?, ?, ?, 'adjustment', ?, ?, ?, ?, 'adjustment', ?, NOW(), NOW())
                                    `, [
                                        movementId,
                                        member.id,
                                        member.name,
                                        quantityChange,
                                        currentStock,
                                        newStock,
                                        saleId,
                                        `Voiding POS Sale: ${saleId} (Sync from Anchor: ${soldProd.name})`
                                    ]);

                                    // Update product stock
                                    await connection.query('UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?', [newStock, member.id]);
                                    console.log(`void-transaction: Updated stock for ${member.name}: ${currentStock} -> ${newStock}`);
                                }
                            }
                        }
                    }
                }
            }

            // 3. Update sales_transactions status to 'voided'
            await connection.query('UPDATE sales_transactions SET status = "Voided", updated_at = NOW() WHERE id = ?', [saleId]);
            console.log('void-transaction: Transaction marked as voided');

            return NextResponse.json({
                success: true,
                message: 'POS sale voided and stock restored successfully'
            });
        });
    } catch (error: any) {
        console.error('Error voiding POS sale:', error);
        return NextResponse.json(
            { success: false, error: `Failed to void POS sale: ${error.message}` },
            { status: 500 }
        );
    }
}

