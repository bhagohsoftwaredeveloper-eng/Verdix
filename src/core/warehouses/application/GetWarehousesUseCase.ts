import { WarehouseRepository } from '../domain/IWarehouseRepository';
import { WarehouseEntity } from '../domain/Warehouse';

export class GetWarehousesUseCase {
  constructor(private warehouseRepository: WarehouseRepository) {}

  async execute(): Promise<WarehouseEntity[]> {
    return await this.warehouseRepository.findAll();
  }
}
