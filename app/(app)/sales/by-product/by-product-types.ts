export type ProductSalesData = {
  product: {
    id: string;
    name: string;
    sku: string;
    category: string;
    brand: string;
    unitOfMeasure: string;
  };
  unitsSold: number;
  totalRevenue: number;
  totalDiscount: number;
  totalCost: number;
  totalProfit: number;
  numberOfSales: number;
  avgPricePerUnit: number;
};

export type TransactionData = {
  id: string;
  orderNumber: string;
  date: string;
  customer: { name: string };
  quantity: number;
  price: number;
  total: number;
  paymentMethod: string;
  cashier: string;
  items: any[];
};
