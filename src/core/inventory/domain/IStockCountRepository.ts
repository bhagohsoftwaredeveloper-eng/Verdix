import { StockCountEntity } from './StockCount';
import { PoolConnection } from 'mysql2/promise';

export interface StockCountRepository {
  findAll(): Promise<StockCountEntity[]>;
  findById(id: string): Promise<StockCountEntity | null>;
  create(stockCount: StockCountEntity): Promise<string>;
  update(id: string, stockCount: Partial<StockCountEntity>): Promise<void>;
  saveWithTransaction(stockCountId: string, operations: (connection: PoolConnection) => Promise<void>): Promise<void>;
}
