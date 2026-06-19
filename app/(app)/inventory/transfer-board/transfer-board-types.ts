import type { Product } from '@/lib/types';

export interface WarehouseStockItem {
  uniqueId: string;
  product: Product;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
}

export interface StagedTransferItem {
  stagedId: string;
  sourceUniqueId: string;
  product: Product;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  maxQuantity: number;
  transferQuantity: number;
}
