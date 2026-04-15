import { MySqlInventoryTransferRepository } from '@/src/infrastructure/repositories/MySqlInventoryTransferRepository';
import { TransferStockService } from '@/src/infrastructure/services/TransferStockService';
import { TransferStockUseCase } from '@/src/core/inventory/application/TransferStockUseCase';

const transferRepository = new MySqlInventoryTransferRepository();
const transferService = new TransferStockService();
const transferStockUseCase = new TransferStockUseCase(transferRepository, transferService);

export async function processTransferStock(body: any) {
  try {
    const transferId = await transferStockUseCase.execute(body);
    return { success: true, transferId };
  } catch (error: any) {
    console.error('Error in processTransferStock:', error);
    return { success: false, error: error.message };
  }
}
