export interface CashTransfer {
  id: string;
  date: string;
  amount: number;
  type: 'deposit' | 'pickup';
  note: string;
  cashier_name: string;
  terminal_name: string;
  user_id: string;
  terminal_id: string;
}

export type Cashier = {
  uid: string;
  display_name: string;
  username: string;
};
