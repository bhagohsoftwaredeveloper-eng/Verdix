import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/lib/mysql';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: invoiceId } = await params;

    try {
        return await withTransaction(async (connection: any) => {
            // 1. Fetch invoice to check status
            const [invoice]: any = await connection.query('SELECT status FROM sales_invoices WHERE id = ?', [invoiceId]);

            if (!invoice || invoice.length === 0) {
                return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
            }

            if (invoice[0].status === 'Voided') {
                return NextResponse.json({ success: false, error: 'Invoice is already voided' }, { status: 400 });
            }

            // 2. Fetch items to reverse stock
            const [items]: any = await connection.query('SELECT product_id, quantity FROM sales_invoice_items WHERE sales_invoice_id = ?', [invoiceId]);

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
                        convFactors.forEach((cf: any) => factorMap.set(cf.unit, parseFloat(cf.factor)));
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
                                    const movementId = `mov_si_rev_${Date.now()}_${member.id.substr(-4)}_${Math.random().toString(36).substr(2, 4)}`;
                                    await connection.query(`
                                        INSERT INTO stock_movements (
                                            id, product_id, product_name, movement_type, 
                                            quantity_change, previous_stock, new_stock, 
                                            reference_id, reference_type, notes, created_at, updated_at
                                        ) VALUES (?, ?, ?, 'adjustment', ?, ?, ?, ?, 'sale', ?, NOW(), NOW())
                                    `, [
                                        movementId,
                                        member.id,
                                        member.name,
                                        quantityChange,
                                        currentStock,
                                        newStock,
                                        invoiceId,
                                        `Voiding of Sales Invoice: ${invoiceId} (Sync from Anchor: ${soldProd.name})`
                                    ]);

                                    // Update product stock
                                    await connection.query('UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?', [newStock, member.id]);
                                }
                            }
                        }
                    }
                }
            }

            // 3. Update invoice status
            await connection.query('UPDATE sales_invoices SET status = "Voided", updated_at = NOW() WHERE id = ?', [invoiceId]);

            return NextResponse.json({
                success: true,
                message: 'Sales invoice voided and stock reversed successfully'
            });
        });
    } catch (error) {
        console.error('Error voiding sales invoice:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to void sales invoice' },
            { status: 500 }
        );
    }
}
