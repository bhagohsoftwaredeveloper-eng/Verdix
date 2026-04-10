import { SaleEntity, SaleItemEntity } from './Sale';
import { PoolConnection } from 'mysql2/promise';

export interface GetSalesFilters {
  warehouse?: string | null;
  countOnly?: boolean;
}

export interface SaleRepository {
  findAll(filters: GetSalesFilters): Promise<SaleEntity[]>;
  findById(id: string): Promise<SaleEntity | null>;
  create(sale: SaleEntity): Promise<string>;
  saveWithTransaction(sale: SaleEntity, inventoryOperations: (connection: PoolConnection) => Promise<void>): Promise<string>;
}
