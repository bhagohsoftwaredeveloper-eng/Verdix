import { ProductEntity } from './Product';

export interface GetProductsFilters {
  category?: string | null;
  search?: string | null;
  warehouseId?: string | null;
  availability?: string | null;
  supplierId?: string | null;
  shelfLocationId?: string | null;
}

export interface ProductRepository {
  findAll(limit: number, offset: number, filters: GetProductsFilters): Promise<ProductEntity[]>;
  countAll(filters: GetProductsFilters): Promise<number>;
  findById(id: string): Promise<ProductEntity | null>;
  create(product: Partial<ProductEntity>): Promise<string>;
  update(id: string, product: Partial<ProductEntity>): Promise<void>;
  delete(id: string): Promise<void>;
}
