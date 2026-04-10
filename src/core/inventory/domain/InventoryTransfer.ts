export interface InventoryTransferEntity {
  id: string;
  sourceWarehouseId: string;
  targetWarehouseId: string;
  transferDate: string;
  reference?: string;
  status: 'Pending' | 'In Transit' | 'Completed' | 'Cancelled';
  notes?: string;
  items: InventoryTransferItemEntity[];
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryTransferItemEntity {
  id: string;
  transferId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitOfMeasure?: string;
  createdAt?: string;
}
