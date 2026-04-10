export interface ProductEntity {
  id: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  stock: number;
  price: number;
  cost?: number;
  sku: string;
  barcode?: string;
  vatStatus?: string;
  availability?: string;
  unitOfMeasure: string;
  reorderPoint: number;
  avgDailySales: number;
  expirationDate?: string;
  warehouseId?: string;
  shelfLocationId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  priceLevels?: ProductPriceLevel[];
}

export interface ProductPriceLevel {
  levelId: string;
  price: number;
  minQuantity: number;
}
