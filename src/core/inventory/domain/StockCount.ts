export interface StockCountEntity {
  id: string;
  warehouseId: string;
  countDate: string;
  status: 'Draft' | 'Completed' | 'Cancelled';
  notes?: string;
  items: StockCountItemEntity[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StockCountItemEntity {
  id: string;
  stockCountId: string;
  productId: string;
  productName: string;
  expectedQuantity: number;
  countedQuantity: number;
  adjustmentReason?: string;
  createdAt?: string;
}
