import { db } from '@/lib/db';
import { InventoryTransferRepository } from '../../core/inventory/domain/IInventoryTransferRepository';
import { InventoryTransferEntity } from '../../core/inventory/domain/InventoryTransfer';

export class MySqlInventoryTransferRepository implements InventoryTransferRepository {
  async findAll(): Promise<InventoryTransferEntity[]> {
    const transfers = await db.inventoryTransfer.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });
    return transfers.map(t => ({
      ...t,
      transferDate: t.transferDate.toISOString(),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      items: t.items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        createdAt: item.createdAt.toISOString()
      }))
    })) as any;
  }

  async findById(id: string): Promise<InventoryTransferEntity | null> {
    const t = await db.inventoryTransfer.findUnique({
      where: { id },
      include: { items: true }
    });
    if (!t) return null;
    return {
      ...t,
      transferDate: t.transferDate.toISOString(),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      items: t.items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        createdAt: item.createdAt.toISOString()
      }))
    } as any;
  }

  async saveWithTransaction(transfer: InventoryTransferEntity, operations: (tx: any) => Promise<void>): Promise<string> {
    return await db.$transaction(async (tx) => {
      await tx.inventoryTransfer.create({
        data: {
          id: transfer.id,
          sourceWarehouseId: transfer.sourceWarehouseId,
          targetWarehouseId: transfer.targetWarehouseId,
          transferDate: new Date(transfer.transferDate),
          reference: transfer.reference,
          status: transfer.status as any,
          notes: transfer.notes,
          items: {
            create: transfer.items.map(item => ({
              id: item.id,
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitOfMeasure: item.unitOfMeasure
            }))
          }
        }
      });
      await operations(tx);
      return transfer.id;
    });
  }
}
