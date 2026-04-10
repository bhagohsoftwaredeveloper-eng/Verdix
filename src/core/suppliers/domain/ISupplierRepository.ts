import { SupplierEntity } from './Supplier';

export interface SupplierRepository {
  findAll(): Promise<SupplierEntity[]>;
  findById(id: string): Promise<SupplierEntity | null>;
  create(supplier: Partial<SupplierEntity>): Promise<string>;
  update(id: string, supplier: Partial<SupplierEntity>): Promise<void>;
  delete(id: string): Promise<void>;
}
