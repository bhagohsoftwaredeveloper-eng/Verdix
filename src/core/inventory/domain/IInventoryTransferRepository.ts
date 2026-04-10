import { InventoryTransferEntity } from './InventoryTransfer';
import { PoolConnection } from 'mysql2/promise';

export interface InventoryTransferRepository {
  findAll(): Promise<InventoryTransferEntity[]>;
  findById(id: string): Promise<InventoryTransferEntity | null>;
  create(transfer: InventoryTransferEntity): Promise<string>;
  saveWithTransaction(transfer: InventoryTransferEntity, operations: (connection: PoolConnection) => Promise<void>): Promise<string>;
}
