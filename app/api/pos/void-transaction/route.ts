import { NextRequest, NextResponse } from 'next/server';
import { withTransaction } from '@/lib/mysql';
import { addFamilyStock, findUltimateRoot } from '@/lib/family-sync';

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
                    // --- Inventory Addition (Reversal) using recursive family sync ---
                    const { rootId, factorToRoot } = await findUltimateRoot(item.product_id, connection as any);
                    const quantityToAddInRootUnits = item.quantity / factorToRoot;
                    
                    await addFamilyStock(
                        rootId, 
                        quantityToAddInRootUnits, 
                        saleId, 
                        'adjustment', 
                        `Voiding POS Sale: ${saleId}`, 
                        connection as any
                    );
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

