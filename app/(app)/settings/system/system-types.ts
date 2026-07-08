export interface SystemSettings {
  currencySymbol: string;
  currencyCode: string;
  timezone: string;
  dateFormat: string;
  fiscalYearStartMonth: number;
}

export const SYSTEM_DEFAULTS: SystemSettings = {
  currencySymbol: '$',
  currencyCode: 'USD',
  timezone: 'UTC',
  dateFormat: 'MM/DD/YYYY',
  fiscalYearStartMonth: 1,
};

export const CURRENCIES = [
  { symbol: '$',  code: 'USD', name: 'US Dollar' },
  { symbol: '€',  code: 'EUR', name: 'Euro' },
  { symbol: '£',  code: 'GBP', name: 'British Pound' },
  { symbol: '₱',  code: 'PHP', name: 'Philippine Peso' },
  { symbol: '¥',  code: 'JPY', name: 'Japanese Yen' },
  { symbol: '¥',  code: 'CNY', name: 'Chinese Yuan' },
  { symbol: '₹',  code: 'INR', name: 'Indian Rupee' },
  { symbol: '₩',  code: 'KRW', name: 'South Korean Won' },
  { symbol: '₫',  code: 'VND', name: 'Vietnamese Dong' },
  { symbol: '฿',  code: 'THB', name: 'Thai Baht' },
  { symbol: '$',  code: 'AUD', name: 'Australian Dollar' },
  { symbol: '$',  code: 'CAD', name: 'Canadian Dollar' },
  { symbol: '$',  code: 'SGD', name: 'Singapore Dollar' },
];
