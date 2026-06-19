import type { Product } from '@/lib/types';

export interface ProductWithChildren extends Product {
  children?: Product[];
}
