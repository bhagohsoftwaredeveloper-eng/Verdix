import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
import { addFamilyStock, deductFamilyStock, findUltimateRoot } from '@/lib/family-sync';

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } | Promise<{ id: string }> }
) {
    const resolvedParams = params instanceof Promise ? await params : params;
    const orderId = resolvedParams.id;

    try {
        return await withTransaction(async (tx) => {
            // 1. Fetch items to reverse stock
            const items = await tx.salesOrderItem.findMany({
                where: { salesOrderId: orderId },
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
                        orderId,
                        'adjustment',
                        `Reversal of Sales Order: ${orderId}`,
                        tx as any
                    );
                }
            }

            // 2. Delete items
            await tx.salesOrderItem.deleteMany({
                where: { salesOrderId: orderId }
            });

            // 3. Delete order
            await tx.salesOrder.delete({
                where: { id: orderId }
            });

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
            items
        } = body;

        return await withTransaction(async (tx) => {
            // --- STEP 1: Inventory Reversal for Existing Items ---
            const oldItems = await tx.salesOrderItem.findMany({
                where: { salesOrderId: orderId },
                select: { productId: true, quantity: true }
            });

            if (oldItems && oldItems.length > 0) {
                for (const item of oldItems) {
                    const { rootId, factorToRoot } = await findUltimateRoot(item.productId, tx as any);
                    const quantityToAddInRootUnits = item.quantity / factorToRoot;

                    await addFamilyStock(
                        rootId,
                        quantityToAddInRootUnits,
                        orderId,
                        'adjustment',
                        `Update Reversal: ${orderId}`,
                        tx as any
                    );
                }
            }

            // --- STEP 2: Delete Old Items ---
            await tx.salesOrderItem.deleteMany({
                where: { salesOrderId: orderId }
            });

            // --- STEP 3: Update Order Details ---
            const total = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

            await tx.salesOrder.update({
                where: { id: orderId },
                data: {
                    customerId: customer.id,
                    orderDate: new Date(orderDate),
                    deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
                    reference: reference || null,
                    deliveryAddress: deliveryAddress || null,
                    total,
                    paymentMethod: paymentMethod || null,
                    status: (status || 'Pending') as any,
                    notes: null
                }
            });

            // --- STEP 4: Insert New Items & Deduct Stock ---
            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                await tx.salesOrderItem.create({
                    data: {
                        salesOrderId: orderId,
                        productId: item.product.id,
                        productName: item.product.name,
                        quantity: item.quantity,
                        price: item.price
                    }
                });

                // Inventory Deduction using recursive family sync
                const { rootId, factorToRoot } = await findUltimateRoot(item.product.id, tx as any);
                const quantityToDeductInRootUnits = item.quantity / factorToRoot;

                await deductFamilyStock(
                    rootId,
                    quantityToDeductInRootUnits,
                    orderId,
                    'sale',
                    `Update Deduction: ${orderId}`,
                    tx as any
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
