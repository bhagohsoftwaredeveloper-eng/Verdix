export type SalesData = {
  date: string;
  transactionCount: number;
  startOR: string;
  endOR: string;
  totalRevenue: number;
  totalDiscount: number;
  vatableSales: number;
  vatAmount: number;
  vatExemptSales: number;
  zeroRatedSales: number;
  nonVatSales: number;
  cost: number;
  profit: number;
};
