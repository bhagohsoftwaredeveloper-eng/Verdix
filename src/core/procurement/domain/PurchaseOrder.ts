export interface PurchaseOrderEntity {
  id: string;
  supplierId: string;
  supplierName: string;
  date: string;
  total: number;
  paymentMethod?: string;
  status: 'Pending' | 'Received' | 'Paid' | 'Cancelled';
  referenceNumber?: string;
  shippingFee: number;
  orderedBy?: string;
  vatAmount: number;
  deliveryDate?: string;
  receivedTotal: number;
  items: PurchaseOrderItemEntity[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseOrderItemEntity {
  id: string;
  purchaseOrderId: string;
  productId: string;
  productName: string;
  quantity: number;
  cost: number;
  sellingPrice?: number;
  discount: number;
  discountType: 'amount' | 'percentage';
  vatSubject: boolean;
  barcode?: string;
  currentStock?: number;
}
