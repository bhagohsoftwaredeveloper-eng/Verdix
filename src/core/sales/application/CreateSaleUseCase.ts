import { SaleRepository } from '../domain/ISaleRepository';
import { SaleEntity, SaleItemEntity } from '../domain/Sale';
import { InventorySyncService } from '../../../infrastructure/services/InventorySyncService';
import { getNextReference, getNextReceiptNumber } from '../../../../lib/db-helpers';
import { deductFromBatches, getBatchCostingSettings } from '../../../../lib/batch-deduction';
import { Prisma } from '@prisma/client';

export interface CreateSaleRequest {
  customer: { id: string; name: string };
  invoiceDate: string;
  dueDate?: string;
  reference?: string;
  paymentMethod: string;
  paymentReference?: string;
  status: any;
  notes?: string;
  items: any[];
  shipping?: number;
}

export class CreateSaleUseCase {
  constructor(
    private saleRepository: SaleRepository,
    private inventoryService: InventorySyncService
  ) {}

  async execute(request: CreateSaleRequest): Promise<string> {
    const saleId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const total = request.items.reduce((acc: number, item: any) => {
      return acc + (item.price * item.quantity);
    }, 0) + (request.shipping || 0);

    // Generate reference if needed
    let finalReference = request.reference;
    if (!finalReference || finalReference.trim() === '') {
      const nextVal = await getNextReference('salesInvoice');
      finalReference = `INV-${nextVal.toString().padStart(6, '0')}`;
    }

    const receiptNumber = await getNextReceiptNumber();

    const saleEntity: SaleEntity = {
      id: saleId,
      customerId: request.customer.id,
      reference: finalReference,
      receiptNumber,
      invoiceDate: request.invoiceDate,
      dueDate: request.dueDate,
      total,
      paymentMethod: request.paymentMethod,
      paymentReference: request.paymentReference,
      status: request.status || 'Pending',
      transactionSource: 'Backoffice',
      notes: request.notes,
      items: request.items.map((item, index) => ({
        id: `${saleId}_item_${index + 1}`,
        saleId: saleId,
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.price
      }))
    };

    // Execute within repository transaction
    await this.saleRepository.saveWithTransaction(saleEntity, async (tx: Prisma.TransactionClient) => {
      // Get batch costing settings
      const { oversellBlock } = await getBatchCostingSettings(tx);

      // 1. Check and deduct inventory for each item
      for (let i = 0; i < request.items.length; i++) {
        const item = request.items[i];
        const productId = item.product.id;
        const qty = item.quantity;
        const saleItemId = `${saleId}_item_${i + 1}`;

        await this.inventoryService.checkStockAvailability(productId, qty, tx);
        
        // --- BATCH COSTING: FIFO Deduction ---
        const deduction = await deductFromBatches(productId, qty, oversellBlock, tx);
        
        // Update the specific sale_item with cost info and batch splits
        // Note: Using raw SQL as cost_at_sale/batch_source might not be in the Prisma model yet
        await tx.$executeRawUnsafe(
          `UPDATE sale_items 
           SET cost_at_sale = $1, batch_source = $2 
           WHERE id = $3`,
          deduction.weightedAvgCost, JSON.stringify(deduction.splits), saleItemId
        );
        // --- END BATCH COSTING ---

        await this.inventoryService.deductStockWithFamilySync(
          { productId: productId, quantity: qty },
          saleId,
          `Sales Invoice: ${finalReference} (Sync from Anchor: ${item.product.name})`,
          tx
        );
      }
    });

    // Handle External Sync (Fire and forget, logic from route.ts)
    this.triggerExternalSync(saleEntity, request.customer, request.items);

    return saleId;
  }

  private async triggerExternalSync(sale: SaleEntity, customer: any, items: any[]) {
    try {
      const { getExternalApiConfig } = await import('../../../../lib/external-api-config');
      const { syncSalesTransaction } = await import('../../../../lib/services/external-accounting-api');
      
      const apiConfig = await getExternalApiConfig();
      if (apiConfig.enabled) {
        const salesData = {
          id: sale.id,
          customer,
          invoiceDate: sale.invoiceDate,
          total: sale.total,
          paymentMethod: sale.paymentMethod,
          paymentReference: sale.paymentReference,
          status: sale.status,
          items,
        };
        
        syncSalesTransaction(sale.id, salesData, apiConfig).catch((err: any) => {
          console.error('Sales sync failed (non-blocking):', err);
        });
      }
    } catch (err) {
      console.error('Error triggering sales sync:', err);
    }
  }
}
