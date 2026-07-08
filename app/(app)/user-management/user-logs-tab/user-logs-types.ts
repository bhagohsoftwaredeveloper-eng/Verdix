export type ActivityLog = {
  id: string;
  user_uid: string;
  user_name: string;
  action: string;
  module: string;
  description: string;
  reference_id: string | null;
  created_at: string;
};

export const MODULE_OPTIONS = [
  'ALL', 'INVENTORY', 'SALES', 'CUSTOMERS', 'PURCHASES',
  'SUPPLIERS', 'PRODUCTS', 'USERS', 'POS', 'SETTINGS',
];

export const ACTION_OPTIONS = [
  'ALL', 'CREATE', 'UPDATE', 'DELETE', 'ENABLE', 'DISABLE',
  'RECEIVE', 'VOID', 'ADJUST', 'TRANSFER', 'LOGIN', 'LOGOUT',
];

export const MODULE_COLORS: Record<string, string> = {
  INVENTORY: 'bg-blue-100 text-blue-700',
  SALES: 'bg-green-100 text-green-700',
  CUSTOMERS: 'bg-purple-100 text-purple-700',
  PURCHASES: 'bg-orange-100 text-orange-700',
  SUPPLIERS: 'bg-yellow-100 text-yellow-700',
  PRODUCTS: 'bg-cyan-100 text-cyan-700',
  USERS: 'bg-pink-100 text-pink-700',
  POS: 'bg-indigo-100 text-indigo-700',
  SETTINGS: 'bg-gray-100 text-gray-700',
};

export const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  ENABLE: 'bg-emerald-100 text-emerald-700',
  DISABLE: 'bg-rose-100 text-rose-700',
  RECEIVE: 'bg-teal-100 text-teal-700',
  VOID: 'bg-red-100 text-red-700',
  ADJUST: 'bg-amber-100 text-amber-700',
  TRANSFER: 'bg-violet-100 text-violet-700',
  LOGIN: 'bg-sky-100 text-sky-700',
  LOGOUT: 'bg-slate-100 text-slate-700',
};
