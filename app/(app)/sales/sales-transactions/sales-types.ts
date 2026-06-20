export type Sale = Record<string, any>;

export type SalesTotals = {
  discounts: number;
  revenue: number;
  amountPaid: number;
  customerBalance: number;
  cost: number;
  grossProfit: number;
  vatableSales: number;
  vatAmount: number;
  nonVatSales: number;
  accountPayments: number;
};
