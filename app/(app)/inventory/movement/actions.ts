'use server';

import { getStockMovements } from '@/lib/stock-movements';
import type { StockMovement } from '@/lib/types';

export type StockMovementFilters = {
  movementType?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
};

export async function fetchStockMovements(filters?: StockMovementFilters): Promise<StockMovement[]> {
  try {
    return await getStockMovements(filters);
  } catch (error) {
    console.error('Failed to fetch stock movements:', error);
    throw new Error('Failed to fetch stock movements');
  }
}
