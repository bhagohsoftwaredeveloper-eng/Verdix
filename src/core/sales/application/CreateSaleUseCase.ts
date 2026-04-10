import { SaleRepository } from '../domain/ISaleRepository';
import { SaleEntity, SaleItemEntity } from '../domain/Sale';
import { InventorySyncService } from '../../../infrastructure/services/InventorySyncService';
import { getNextReference, getNextReceiptNumber } from '../../../../lib/mysql';
import { PoolConnection } from 'mysql2/promise';

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
      const nextVal = await getNextReference('sales_invoice');
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
    await this.saleRepository.saveWithTransaction(saleEntity, async (connection: PoolConnection) => {
      // 1. Check and deduct inventory for each item
      for (const item of request.items) {
        await this.inventoryService.checkStockAvailability(item.product.id, item.quantity, connection);
        await this.inventoryService.deductStockWithFamilySync(
          { productId: item.product.id, quantity: item.quantity },
          saleId,
          `Sales Invoice: ${finalReference} (Sync from Anchor: ${item.product.name})`,
          connection
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
