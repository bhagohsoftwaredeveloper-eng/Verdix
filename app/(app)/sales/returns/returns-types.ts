export interface ReturnRecord {
  /** Merchandise Credit number (e.g. "MC-000001"). Empty for returns issued
   *  before MC numbering existed — those were never assigned one. */
  mcNo: string;
  origSiNo: string;
  currSiNo: string;
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
