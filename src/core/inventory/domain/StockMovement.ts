export interface StockMovementEntity {
  id: string;
  productId: string;
  productName: string;
  movementType: 'in' | 'out' | 'adjustment' | 'transfer' | 'sale' | 'purchase' | 'return' | 'void';
  quantityChange: number;
  previousStock: number;
  newStock: number;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
  userName?: string;
  warehouseId?: string;
  createdAt?: string;
  updatedAt?: string;
}
