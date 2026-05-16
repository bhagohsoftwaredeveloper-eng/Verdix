import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
import { addFamilyStock, findUltimateRoot } from '@/lib/family-sync';

export async function POST(request: NextRequest) {
    try {
        const { saleId } = await request.json();

        if (!saleId) {
            return NextResponse.json({ success: false, error: 'Sale ID is required' }, { status: 400 });
        }

        return await withTransaction(async (tx) => {
            // 1. Fetch sales transaction to check status
            const sale = await tx.salesTransaction.findUnique({
                where: { id: saleId },
                select: { id: true, status: true }
            });

            if (!sale) {
                return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
            }

            // Note: status from schema is CaseSensitive Enum (Paid, Pending, Voided, etc.)
            if (sale.status === 'Voided') {
                return NextResponse.json({ success: false, error: 'Transaction is already voided' }, { status: 400 });
            }

            // 2. Fetch items to reverse stock
            const items = await tx.saleItem.findMany({
                where: { saleId: saleId },
                select: { productId: true, productName: true, quantity: true }
            });

            if (items && items.length > 0) {
                for (const item of items) {
                    // --- Inventory Addition (Reversal) using recursive family sync ---
                    const { rootId, factorToRoot } = await findUltimateRoot(item.productId, tx);
                    const quantityToAddInRootUnits = Number(item.quantity) / factorToRoot;
                    
                    await addFamilyStock(
                        rootId, 
                        quantityToAddInRootUnits, 
                        saleId, 
                        'adjustment', 
                        `Voiding POS Sale: ${saleId}`, 
                        tx
                    );
                }
            }

            // 3. Update sales_transactions status to 'Voided'
            await tx.salesTransaction.update({
                where: { id: saleId },
                data: { 
                    status: 'Voided',
                    updatedAt: new Date()
                }
            });

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
