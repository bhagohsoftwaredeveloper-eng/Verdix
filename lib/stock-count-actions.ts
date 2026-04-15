import { MySqlStockCountRepository } from '../src/infrastructure/repositories/MySqlStockCountRepository';
import { CompleteStockCountUseCase } from '../src/core/inventory/application/CompleteStockCountUseCase';

const stockCountRepository = new MySqlStockCountRepository();
const completeStockCountUseCase = new CompleteStockCountUseCase(stockCountRepository);

export async function processCompleteStockCount(stockCountId: string) {
  try {
    await completeStockCountUseCase.execute(stockCountId);
    return { success: true };
  } catch (error: any) {
    console.error('Error processing stock count completion:', error);
    return { success: false, error: error.message || 'Failed to complete stock count' };
  }
}
