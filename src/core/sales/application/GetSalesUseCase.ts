import { SaleRepository, GetSalesFilters } from '../domain/ISaleRepository';
import { SaleEntity } from '../domain/Sale';

export class GetSalesUseCase {
  constructor(private saleRepository: SaleRepository) {}

  async execute(filters: GetSalesFilters): Promise<SaleEntity[]> {
    return await this.saleRepository.findAll(filters);
  }
}
