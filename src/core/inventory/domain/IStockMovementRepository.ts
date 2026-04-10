import { StockMovementEntity } from './StockMovement';

export interface GetStockMovementsFilters {
  productId?: string;
  warehouseId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface StockMovementRepository {
  findAll(filters: GetStockMovementsFilters): Promise<StockMovementEntity[]>;
  countAll(filters: GetStockMovementsFilters): Promise<number>;
  create(movement: Partial<StockMovementEntity>): Promise<string>;
}
