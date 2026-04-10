import { StockMovementRepository, GetStockMovementsFilters } from '../domain/IStockMovementRepository';
import { StockMovementEntity } from '../domain/StockMovement';

export interface GetStockMovementsResponse {
  movements: StockMovementEntity[];
  total: number;
}

export class GetStockMovementsUseCase {
  constructor(private stockMovementRepository: StockMovementRepository) {}

  async execute(filters: GetStockMovementsFilters): Promise<GetStockMovementsResponse> {
    const [movements, total] = await Promise.all([
      this.stockMovementRepository.findAll(filters),
      this.stockMovementRepository.countAll(filters)
    ]);

    return { movements, total };
  }
}
