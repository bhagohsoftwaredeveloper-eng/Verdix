export interface ReturnRecord {
  soNo: string;
  orNo: string;
  transDate: string;
  soldByCashier: string;
  returnedDate: string;
  returnedByCashier: string;
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
