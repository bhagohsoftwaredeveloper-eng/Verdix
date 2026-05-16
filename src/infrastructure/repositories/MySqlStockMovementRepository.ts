import { db } from '@/lib/db';
import { StockMovementRepository, GetStockMovementsFilters } from '../../core/inventory/domain/IStockMovementRepository';
import { StockMovementEntity } from '../../core/inventory/domain/StockMovement';
import { Prisma } from '@prisma/client';

export class MySqlStockMovementRepository implements StockMovementRepository {
  async findAll(filters: GetStockMovementsFilters): Promise<StockMovementEntity[]> {
    const where: Prisma.StockMovementWhereInput = {};

    if (filters.productId) where.productId = filters.productId;
    // if (filters.warehouseId) where.warehouseId = filters.warehouseId; // check if schema has warehouseId
    
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const movements = await db.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit,
      skip: filters.offset
    });

    return movements.map(m => ({
      id: m.id,
      productId: m.productId,
      productName: m.productName,
      movementType: m.movementType as any,
      quantityChange: Number(m.quantityChange),
      previousStock: Number(m.previousStock),
      newStock: Number(m.newStock),
      referenceId: m.referenceId || undefined,
      referenceType: m.referenceType || undefined,
      notes: m.notes || undefined,
      userName: m.userName || undefined,
      warehouseId: m.warehouseId || undefined,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString()
    }));
  }

  async countAll(filters: GetStockMovementsFilters): Promise<number> {
    const where: Prisma.StockMovementWhereInput = {};

    if (filters.productId) where.productId = filters.productId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    return await db.stockMovement.count({ where });
  }

  async create(movement: Partial<StockMovementEntity>): Promise<string> {
    const id = movement.id || `mov_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const created = await db.stockMovement.create({
      data: {
        id,
        productId: movement.productId!,
        productName: movement.productName!,
        movementType: movement.movementType as any,
        quantityChange: Number(movement.quantityChange),
        previousStock: Number(movement.previousStock),
        newStock: Number(movement.newStock),
        referenceId: movement.referenceId || null,
        referenceType: movement.referenceType || null,
        notes: movement.notes || null,
        userName: movement.userName || null,
        warehouseId: movement.warehouseId || null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return created.id;
  }
}
