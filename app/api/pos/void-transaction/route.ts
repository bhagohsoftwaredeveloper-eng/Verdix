import { NextRequest, NextResponse } from 'next/server';
import { withTransaction, query } from '@/lib/mysql';
import { addFamilyStock, findUltimateRoot } from '@/lib/family-sync';
import { saveEJournalFiles } from '@/lib/ejournal/ejournal-writer';

// The void_reason column can't disappear once ensured — only pay the
// INFORMATION_SCHEMA round trip until the first success this process.
let voidReasonColumnEnsured = false;

async function ensureVoidReasonColumn() {
    if (voidReasonColumnEnsured) return;
    const cols = await query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'sales_transactions' AND TABLE_SCHEMA = DATABASE()"
    ) as any[];
    if (!cols.some((c: any) => c.COLUMN_NAME === 'void_reason')) {
        await query("ALTER TABLE sales_transactions ADD COLUMN void_reason VARCHAR(255) DEFAULT NULL");
        console.log('✅ Added void_reason column to sales_transactions');
    }
    voidReasonColumnEnsured = true;
}

export async function POST(request: NextRequest) {
    try {
        const { saleId, voidReason } = await request.json();
        console.log('void-transaction: Received saleId:', saleId);

        if (!saleId) {
            return NextResponse.json({ success: false, error: 'Sale ID is required' }, { status: 400 });
        }

        await ensureVoidReasonColumn();

        return await withTransaction(async (connection: any) => {
            // 1. Fetch sales transaction to check status
            const [sale]: any = await connection.query('SELECT id, status FROM sales_transactions WHERE id = ?', [saleId]);
            console.log('void-transaction: Found sale:', sale);

            if (!sale || sale.length === 0) {
                return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
            }

            if (String(sale[0].status || '').toLowerCase() === 'voided') {
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
            await connection.query(
                'UPDATE sales_transactions SET status = "Voided", void_reason = ?, updated_at = NOW() WHERE id = ?',
                [voidReason?.trim() || null, saleId]
            );
            console.log('void-transaction: Transaction marked as voided');

            const [meta]: any = await connection.query(
              `SELECT DATE(st.created_at) AS d, pt.terminal_id AS t
               FROM sales_transactions st JOIN pos_transactions pt ON pt.sale_id = st.id
               WHERE st.id = ? LIMIT 1`, [saleId]
            );
            const d = meta?.[0]?.d ? String(meta[0].d) : null;
            if (d) saveEJournalFiles(d, meta[0].t ?? 'all').catch((e) => console.error('e-journal auto-save failed:', e));

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

