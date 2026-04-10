import { ProductRepository, GetProductsFilters } from '../domain/IProductRepository';
import { ProductEntity } from '../domain/Product';

export interface GetProductsRequest {
  limit: number;
  offset: number;
  filters: GetProductsFilters;
}

export interface GetProductsResponse {
  products: ProductEntity[];
  total: number;
}

export class GetProductsUseCase {
  constructor(private productRepository: ProductRepository) {}

  async execute(request: GetProductsRequest): Promise<GetProductsResponse> {
    const [products, total] = await Promise.all([
      this.productRepository.findAll(request.limit, request.offset, request.filters),
      this.productRepository.countAll(request.filters)
    ]);

    return { products, total };
  }
}
