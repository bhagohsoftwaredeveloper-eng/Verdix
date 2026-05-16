import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
import { SaleRepository, GetSalesFilters } from '../../core/sales/domain/ISaleRepository';
import { SaleEntity, SaleItemEntity } from '../../core/sales/domain/Sale';
import { Prisma } from '@prisma/client';

export class MySqlSaleRepository implements SaleRepository {
  async findAll(filters: GetSalesFilters): Promise<SaleEntity[]> {
    const invoices = await db.salesInvoice.findMany({
      include: {
        items: true,
        customer: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // In Prisma, we can't easily do a nested subquery for orderNumber in one go like the SQL above,
    // so we'll fetch the order numbers if needed, or join if formal relations exist.
    // The formal relation between SalesTransaction and PosTransaction exists in schema.
    // Let's optimize by fetching relevant posTransactions.

    const references = invoices.map(i => i.reference).filter(Boolean) as string[];
    const posTransactions = await db.posTransaction.findMany({
      where: {
        sale: {
          reference: { in: references }
        }
      },
      select: {
        orderNumber: true,
        sale: {
          select: { reference: true }
        }
      }
    });

    const orderNumberMap = new Map(posTransactions.map(pt => [pt.sale?.reference, pt.orderNumber]));

    return invoices.map(inv => {
      return {
        id: inv.id,
        customerId: inv.customerId || undefined,
        reference: inv.reference || '',
        receiptNumber: inv.receiptNumber || '',
        invoiceDate: inv.invoiceDate.toISOString(),
        dueDate: inv.dueDate?.toISOString(),
        total: Number(inv.total),
        paymentMethod: inv.paymentMethod || '',
        paymentReference: inv.paymentReference || undefined,
        status: inv.status as any,
        transactionSource: inv.transactionSource || '',
        notes: inv.notes || undefined,
        createdAt: inv.createdAt.toISOString(),
        updatedAt: inv.updatedAt.toISOString(),
        orderNumber: orderNumberMap.get(inv.reference) || null,
        items: inv.items.map(item => ({
          id: item.id,
          saleId: item.salesInvoiceId,
          productId: item.productId,
          productName: item.productName,
          quantity: Number(item.quantity),
          price: Number(item.price),
          // costAtSale and batchSource might need to be fetched from sale_items via relation if needed
        })) as any[]
      };
    });
  }

  async findById(id: string): Promise<SaleEntity | null> {
    const inv = await db.salesInvoice.findUnique({
      where: { id },
      include: { items: true }
    });
    if (!inv) return null;

    // Fetch order number separately
    let orderNumber = null;
    if (inv.reference) {
        const pt = await db.posTransaction.findFirst({
            where: { sale: { reference: inv.reference } },
            select: { orderNumber: true }
        });
        orderNumber = pt?.orderNumber || null;
    }

    return {
      id: inv.id,
      customerId: inv.customerId || undefined,
      reference: inv.reference || '',
      receiptNumber: inv.receiptNumber || '',
      invoiceDate: inv.invoiceDate.toISOString(),
      dueDate: inv.dueDate?.toISOString(),
      total: Number(inv.total),
      paymentMethod: inv.paymentMethod || '',
      paymentReference: inv.paymentReference || undefined,
      status: inv.status as any,
      transactionSource: inv.transactionSource || '',
      notes: inv.notes || undefined,
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
      orderNumber,
      items: inv.items.map(item => ({
        id: item.id,
        saleId: item.salesInvoiceId,
        productId: item.productId,
        productName: item.productName,
        quantity: Number(item.quantity),
        price: Number(item.price),
      })) as any[]
    };
  }

  async create(sale: SaleEntity): Promise<string> {
    throw new Error('Use saveWithTransaction for complete Sale creation');
  }

  async saveWithTransaction(sale: SaleEntity, inventoryOperations: (tx: Prisma.TransactionClient) => Promise<void>): Promise<string> {
    return await withTransaction(async (tx) => {
      // 1. Insert into sales_invoices
      await tx.salesInvoice.create({
        data: {
          id: sale.id,
          customerId: sale.customerId,
          reference: sale.reference,
          receiptNumber: sale.receiptNumber,
          invoiceDate: new Date(sale.invoiceDate),
          dueDate: sale.dueDate ? new Date(sale.dueDate) : null,
          total: sale.total,
          paymentMethod: sale.paymentMethod,
          paymentReference: sale.paymentReference,
          status: sale.status as any,
          transactionSource: sale.transactionSource,
          notes: sale.notes,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // 2. Insert items
      if (sale.items && sale.items.length > 0) {
        await tx.salesInvoiceItem.createMany({
          data: sale.items.map(item => ({
            id: item.id,
            salesInvoiceId: sale.id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            createdAt: new Date()
          }))
        });
      }

      // 3. Perform inventory operations
      await inventoryOperations(tx);

      return sale.id;
    });
  }
}
