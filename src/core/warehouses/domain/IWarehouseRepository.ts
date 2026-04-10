import { WarehouseEntity } from './Warehouse';

export interface WarehouseRepository {
  findAll(): Promise<WarehouseEntity[]>;
  findById(id: string): Promise<WarehouseEntity | null>;
  create(warehouse: Partial<WarehouseEntity>): Promise<string>;
  update(id: string, warehouse: Partial<WarehouseEntity>): Promise<void>;
  delete(id: string): Promise<void>;
}
