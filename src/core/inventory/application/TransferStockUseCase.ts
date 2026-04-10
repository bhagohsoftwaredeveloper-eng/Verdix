import { InventoryTransferRepository } from '../domain/IInventoryTransferRepository';
import { InventoryTransferEntity } from '../domain/InventoryTransfer';
import { TransferStockService } from '../../../infrastructure/services/TransferStockService';

export interface TransferStockRequest {
  sourceWarehouseId: string;
  targetWarehouseId: string;
  transferDate: string;
  reference?: string;
  notes?: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitOfMeasure?: string;
  }>;
}

export class TransferStockUseCase {
  constructor(
    private transferRepository: InventoryTransferRepository,
    private transferService: TransferStockService
  ) {}

  async execute(request: TransferStockRequest): Promise<string> {
    const transferId = `trf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const transferEntity: InventoryTransferEntity = {
      id: transferId,
      sourceWarehouseId: request.sourceWarehouseId,
      targetWarehouseId: request.targetWarehouseId,
      transferDate: request.transferDate,
      reference: request.reference,
      status: 'Completed', // For now, auto-completing
      notes: request.notes,
      items: request.items.map((item, index) => ({
        id: `${transferId}_item_${index + 1}`,
        transferId: transferId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure
      }))
    };

    await this.transferRepository.saveWithTransaction(transferEntity, async (connection) => {
      for (const item of request.items) {
        await this.transferService.syncFamilyStockDuringTransfer(
          transferId,
          item.productId,
          request.targetWarehouseId,
          item.quantity,
          request.notes,
          connection
        );
      }
    });

    return transferId;
  }
}
