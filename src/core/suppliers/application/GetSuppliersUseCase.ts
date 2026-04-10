import { SupplierRepository } from '../domain/ISupplierRepository';
import { SupplierEntity } from '../domain/Supplier';

export class GetSuppliersUseCase {
  constructor(private supplierRepository: SupplierRepository) {}

  async execute(): Promise<SupplierEntity[]> {
    return await this.supplierRepository.findAll();
  }
}
