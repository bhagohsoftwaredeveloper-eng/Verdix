import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
import { addFamilyStock, findUltimateRoot } from '@/lib/family-sync';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: invoiceId } = await params;

    try {
        return await withTransaction(async (tx) => {
            // 1. Fetch invoice to check status
            const invoice = await tx.salesInvoice.findUnique({
                where: { id: invoiceId },
                select: { status: true }
            });

            if (!invoice) {
                return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
            }

            if (invoice.status === 'Voided') {
                return NextResponse.json({ success: false, error: 'Invoice is already voided' }, { status: 400 });
            }

            // 2. Fetch items to reverse stock
            const items = await tx.salesInvoiceItem.findMany({
                where: { salesInvoiceId: invoiceId },
                select: { productId: true, quantity: true }
            });

            if (items && items.length > 0) {
                for (const item of items) {
                    // --- Inventory Addition (Reversal) using recursive family sync ---
                    const { rootId, factorToRoot } = await findUltimateRoot(item.productId, tx as any);
                    const quantityToAddInRootUnits = item.quantity / factorToRoot;

                    await addFamilyStock(
                        rootId,
                        quantityToAddInRootUnits,
                        invoiceId,
                        'adjustment',
                        `Voiding of Sales Invoice: ${invoiceId}`,
                        tx as any
                    );
                }
            }

            // 3. Update invoice status
            await tx.salesInvoice.update({
                where: { id: invoiceId },
                data: { status: 'Voided' }
            });

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
