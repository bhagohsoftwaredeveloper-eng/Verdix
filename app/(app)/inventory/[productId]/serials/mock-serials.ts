import type { SerialNumber } from '@/lib/types';

// Mock serial data. Mutated in-place (push/splice) by the add/delete handlers so
// every importer shares the same live array reference.
export const mockSerialNumbers: SerialNumber[] = [
  // Nike Shoes Serials
  {
    id: 'NK-123456789',
    productId: '2',
    status: 'In Stock',
    dateAdded: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'NK-987654321',
    productId: '2',
    status: 'In Stock',
    dateAdded: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'NK-111222333',
    productId: '2',
    status: 'Sold',
    dateAdded: new Date(Date.now() - 5 * 86400000).toISOString(),
    saleId: 'sale-2',
  },
  {
    id: 'NK-444555666',
    productId: '2',
    status: 'In Stock',
    dateAdded: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  // Dell Laptop Serials
  {
    id: 'DL-777888999',
    productId: '5',
    status: 'In Stock',
    dateAdded: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'DL-000111222',
    productId: '5',
    status: 'In Stock',
    dateAdded: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'DL-333444555',
    productId: '5',
    status: 'Sold',
    dateAdded: new Date(Date.now() - 7 * 86400000).toISOString(),
    saleId: 'sale-1',
  },
];
