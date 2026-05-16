import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
import { StockCountRepository } from '../../core/inventory/domain/IStockCountRepository';
import { StockCountEntity, StockCountItemEntity } from '../../core/inventory/domain/StockCount';
import { Prisma } from '@prisma/client';

export class MySqlStockCountRepository implements StockCountRepository {
  async findAll(): Promise<StockCountEntity[]> {
    const counts = await db.stockCount.findMany({
      include: {
        warehouse: { select: { name: true } },
        shelfLocation: { select: { name: true } },
        items: {
          include: {
            product: {
              select: { name: true, sku: true, barcode: true, shelfId: true, shelf: { select: { name: true } } }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return counts.map(c => {
      // Collect distinct shelf names from products in this count
      const shelfNames = Array.from(new Set(
        c.items
          .map(item => item.product?.shelf?.name)
          .filter(Boolean)
      )) as string[];

      return {
        id: c.id,
        name: c.name,
        status: c.status as any,
        notes: c.notes || undefined,
        warehouseId: c.warehouseId || undefined,
        shelfLocationId: c.shelfLocationId || undefined,
        createdBy: c.createdBy || undefined,
        completedBy: c.completedBy || undefined,
        completedAt: c.completedAt?.toISOString(),
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        warehouseName: c.warehouse?.name,
        shelfName: c.shelfLocation?.name,
        shelfNames,
        items: c.items.map(item => ({
          id: item.id,
          stockCountId: item.stockCountId,
          productId: item.productId,
          snapshotQuantity: Number(item.snapshotQuantity),
          countedQuantity: item.countedQuantity != null ? Number(item.countedQuantity) : undefined,
          variance: item.variance != null ? Number(item.variance) : undefined,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          productName: item.product?.name,
          sku: item.product?.sku,
          barcode: item.product?.barcode
        }))
      };
    });
  }

  async findById(id: string): Promise<StockCountEntity | null> {
    const c = await db.stockCount.findUnique({
      where: { id },
      include: {
        warehouse: { select: { name: true } },
        shelfLocation: { select: { name: true } },
        items: {
          include: {
            product: {
              select: { name: true, sku: true, barcode: true, shelfId: true, shelf: { select: { name: true } } }
            }
          }
        }
      }
    });

    if (!c) return null;

    const shelfNames = Array.from(new Set(
      c.items
        .map(item => item.product?.shelf?.name)
        .filter(Boolean)
    )) as string[];

    return {
      id: c.id,
      name: c.name,
      status: c.status as any,
      notes: c.notes || undefined,
      warehouseId: c.warehouseId || undefined,
      shelfLocationId: c.shelfLocationId || undefined,
      createdBy: c.createdBy || undefined,
      completedBy: c.completedBy || undefined,
      completedAt: c.completedAt?.toISOString(),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      warehouseName: c.warehouse?.name,
      shelfName: c.shelfLocation?.name,
      shelfNames,
      items: c.items.map(item => ({
        id: item.id,
        stockCountId: item.stockCountId,
        productId: item.productId,
        snapshotQuantity: Number(item.snapshotQuantity),
        countedQuantity: item.countedQuantity != null ? Number(item.countedQuantity) : undefined,
        variance: item.variance != null ? Number(item.variance) : undefined,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        productName: item.product?.name,
        sku: item.product?.sku,
        barcode: item.product?.barcode
      }))
    };
  }

  async create(stockCount: StockCountEntity): Promise<string> {
    return await withTransaction(async (tx) => {
      const created = await tx.stockCount.create({
        data: {
          id: stockCount.id,
          name: stockCount.name,
          warehouseId: stockCount.warehouseId || null,
          shelfLocationId: stockCount.shelfLocationId || null,
          status: stockCount.status as any,
          notes: stockCount.notes || null,
          createdBy: stockCount.createdBy || 'Admin',
          createdAt: new Date(),
          updatedAt: new Date(),
          items: {
            create: stockCount.items?.map(item => ({
              id: item.id,
              productId: item.productId,
              snapshotQuantity: item.snapshotQuantity,
              countedQuantity: item.countedQuantity || null,
              variance: item.variance || null,
              createdAt: new Date(),
              updatedAt: new Date()
            }))
          }
        }
      });
      return created.id;
    });
  }

  async update(id: string, stockCount: Partial<StockCountEntity>): Promise<void> {
    const data: any = {};
    if (stockCount.status) data.status = stockCount.status;
    if (stockCount.notes !== undefined) data.notes = stockCount.notes;
    if (stockCount.completedBy) data.completedBy = stockCount.completedBy;
    if (stockCount.completedAt) data.completedAt = new Date(stockCount.completedAt);

    await db.stockCount.update({
      where: { id },
      data: { ...data, updatedAt: new Date() }
    });
  }

  async saveWithTransaction(stockCountId: string, operations: (tx: Prisma.TransactionClient) => Promise<void>): Promise<void> {
    await withTransaction(async (tx) => {
      await operations(tx);
    });
  }
}
