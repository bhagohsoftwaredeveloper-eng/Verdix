export interface Product {
  id: string;
  name: string;
  description: string;
  additionalDescription?: string;
  category: string;
  brand: string;
  subcategory?: string;
  supplier?: string;
  supplierName?: string;
  stock: number;
  reorderPoint: number;
  avgDailySales: number;
  price: number;
  cost?: number;
  sku: string;
  barcode?: string;
  imageUrl: string;
  imageHint: string;
  unitOfMeasure: string;
  vatStatus?: string;
  availability?: string;
  taxType?: 'VAT' | 'NON_VAT' | 'ZERO_RATED' | 'VAT_EXEMPT';

  // Accounting
  incomeAccount?: string;
  expenseAccount?: string;

  // Warehouse
  warehouse?: string;
  warehouseName?: string;
  warehouseId?: string;

  // Parent/Child relationship
  parentId?: string;
  conversionFactor?: number;

  // Conversion factors for different units
  conversionFactors?: { unit: string; factor: number }[];

  // Timestamps
  createdAt?: string;
  updatedAt?: string;

  // Price Levels
  priceLevels?: { levelId: string; price: number }[];

  // Supplier Mapping
  primarySupplierRop?: number;
  mappings?: SupplierProductMapping[];
}

export interface PriceLevel {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  percentageAdjustment?: number; // 100 = 100% (No change), 90 = 10% discount
  minQuantity?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  contactNumber: string;
  active?: boolean;
  salesPerson?: string;
  salesArea?: string;
  salesGroup?: string;
  loyaltyPoints?: number;
  paymentTerms?: string;
  address?: string;
  billingAddress?: string;
  discount?: number;
  creditLimit?: number;
  priceLevelId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactNumber: string;
  telephone?: string;
  mobilePhone?: string;
  email?: string;
  address?: string;
  company?: string;
  tin?: string;
  paymentTerms?: string;
  markupPercentage?: number;
  orderSchedule?: string;
}

export interface SaleItem {
  product: Product;
  quantity: number;
  price: number;
}

export interface Sale {
  id: string;
  customer: Customer;
  invoiceDate?: string;
  date?: string;
  dueDate?: string;
  orderDate?: string;
  deliveryDate?: string;
  reference?: string;
  deliveryAddress?: string;
  salesPerson?: string;
  items: SaleItem[];
  total: number;
  formattedTotal?: string;
  paymentMethod: string;
  status: 'Paid' | 'Pending' | 'Failed' | 'Shipped' | 'Delivered' | 'Returned' | 'Voided' | 'To Deliver' | 'Fully Delivered';
  orderNumber?: number;
  notes?: string;
  shipping?: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    cost: number;
    sellingPrice?: number;
    discount?: number;
    discountType?: 'amount' | 'percentage';
    vatSubject?: boolean;
    expirationDate?: string;
    barcode?: string;
    currentStock?: number;
  }[];
  total: number;
  paymentMethod: string;
  status: string;
  // New tracking fields
  orderedBy?: string;
  shippingFee?: number;
  vatAmount?: number;
  deliveryDate?: string; // or Date
  receivedTotal?: number;
  referenceNumber?: string;
}


export interface Category {
  id: string;
  name: string;
  markupPercentage?: number;
}

export interface Brand {
  id: string;
  name: string;
  markupPercentage?: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface SalesPerson {
  id: string;
  name: string;
  contactNumber?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName?: string;
  product?: Product;
  quantity: number;
  reason: string;
  date: string;
  newStock: number;
}

export interface Order {
  id: string;
  customerId: string;
  orderDate: string;
  status: 'Pending' | 'Shipped' | 'Delivered' | 'Canceled';
  total: number;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }[];
}

export interface SerialNumber {
  id: string; // The serial number itself
  productId: string;
  status: 'In Stock' | 'Sold' | 'Returned';
  dateAdded: string;
  saleId?: string;
}

export interface UnitOfMeasure {
  id: string;
  name: string;
  abbreviation: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'income' | 'expense';
  code?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  movementType: 'sale' | 'purchase' | 'adjustment' | 'return' | 'transfer';
  quantityChange: number;
  previousStock: number;
  newStock: number;
  referenceId?: string;
  referenceType?: 'sale' | 'purchase' | 'adjustment' | 'return' | 'transfer';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// POS-specific interfaces
export interface SystemSettings {
  id?: string;
  businessName?: string;
  currencySymbol: string;
  currencyCode: string;
  timezone: string;
  dateFormat: string;
  enableAutomaticMarkup?: boolean;
  defaultMarkupPercentage?: number;
  markupPriority?: string[];
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  role: 'admin' | 'cashier' | 'manager';
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}


export interface PosTerminal {
  id: string;
  name: string;
  location?: string;
  ipAddress?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Shift {
  id: string;
  userId: string;
  user?: User;
  terminalId?: string;
  terminal?: PosTerminal;
  startTime: string;
  endTime?: string;
  startingCash: number;
  expectedCash: number;
  actualCash: number;
  cashDifference: number;
  status: 'active' | 'completed' | 'reconciled';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PosTransaction {
  id: string;
  saleId: string;
  shiftId?: string;
  shift?: Shift;
  userId: string;
  user?: User;
  terminalId?: string;
  terminal?: PosTerminal;
  transactionType: 'sale' | 'void' | 'return' | 'refund';
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentReference?: string;
  customerCount: number;
  transactionTime: string;
  voidReason?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PosTransactionItem {
  id: string;
  posTransactionId: string;
  saleItemId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercentage: number;
  discountAmount: number;
  lineTotal: number;
  createdAt?: string;
}

export interface SupplierProductMapping {
  id: string;
  productId: string;
  supplierId: string;
  supplierName?: string;
  supplierSku?: string;
  supplierLeadTime: number;
  supplierSpecificRop: number;
  supplierCost?: number;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaxRate {
  id: string;
  name: string;
  rate: number;
  description?: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}
