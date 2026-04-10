import { PurchaseOrderEntity } from './PurchaseOrder';
import { PoolConnection } from 'mysql2/promise';

export interface GetPurchaseOrdersFilters {
  status?: string;
  supplierId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface PurchaseOrderRepository {
  findAll(filters: GetPurchaseOrdersFilters): Promise<PurchaseOrderEntity[]>;
  countAll(filters: GetPurchaseOrdersFilters): Promise<number>;
  findById(id: string): Promise<PurchaseOrderEntity | null>;
  create(order: PurchaseOrderEntity): Promise<string>;
  saveWithTransaction(order: PurchaseOrderEntity, operations: (connection: PoolConnection) => Promise<void>): Promise<string>;
}
