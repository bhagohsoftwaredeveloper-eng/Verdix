export interface VoidRecord {
  refNo: string;
  siNo: string;
  transDate: string;
  customer: string;
  cashier: string;
  voidDate: string;
  voidedBy: string;
  overrideBy: string;
  salesAmount: number;
  cost: number;
  profit: number;
  vatableSales: number;
  vatAmount: number;
  note: string;
}

export const formatCurrency = (value: number) =>
  `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
