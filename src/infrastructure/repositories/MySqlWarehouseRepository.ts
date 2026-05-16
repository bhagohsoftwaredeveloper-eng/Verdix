import { db } from '@/lib/db';
import { WarehouseRepository } from '../../core/warehouses/domain/IWarehouseRepository';
import { WarehouseEntity } from '../../core/warehouses/domain/Warehouse';

export class MySqlWarehouseRepository implements WarehouseRepository {
  async findAll(): Promise<WarehouseEntity[]> {
    const warehouses = await db.warehouse.findMany({ orderBy: { name: 'asc' } });
    return warehouses.map(w => ({
      id: w.id,
      name: w.name,
      location: w.location || undefined,
      active: w.isActive,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    }));
  }

  async findById(id: string): Promise<WarehouseEntity | null> {
    const w = await db.warehouse.findUnique({ where: { id } });
    if (!w) return null;
    return {
      id: w.id,
      name: w.name,
      location: w.location || undefined,
      active: w.isActive,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    };
  }

  async create(warehouse: Partial<WarehouseEntity>): Promise<string> {
    const created = await db.warehouse.create({
      data: {
        id: warehouse.id || `wh_${Date.now()}`,
        name: warehouse.name!,
        location: warehouse.location,
        isActive: warehouse.active ?? true,
      }
    });
    return created.id;
  }

  async update(id: string, warehouse: Partial<WarehouseEntity>): Promise<void> {
    const data: any = {};
    if (warehouse.name !== undefined) data.name = warehouse.name;
    if (warehouse.location !== undefined) data.location = warehouse.location;
    if (warehouse.active !== undefined) data.isActive = warehouse.active;

    await db.warehouse.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await db.warehouse.delete({ where: { id } });
  }
}
