import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { MySqlSaleRepository } from '../../../src/infrastructure/repositories/MySqlSaleRepository';
import { MySqlCustomerRepository } from '../../../src/infrastructure/repositories/MySqlCustomerRepository';
import { InventorySyncService } from '../../../src/infrastructure/services/InventorySyncService';
import { CreateSaleUseCase } from '../../../src/core/sales/application/CreateSaleUseCase';
import { GetSalesUseCase } from '../../../src/core/sales/application/GetSalesUseCase';

// Initialize dependencies
const saleRepository = new MySqlSaleRepository();
const customerRepository = new MySqlCustomerRepository();
const inventoryService = new InventorySyncService();
const createSaleUseCase = new CreateSaleUseCase(saleRepository, inventoryService);
const getSalesUseCase = new GetSalesUseCase(saleRepository);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const saleId = await createSaleUseCase.execute(body);

    // Fetch the created sale to return it (or just return the response)
    // For consistency with original route.ts, constructing a partial response
    return NextResponse.json({
      success: true,
      message: 'Sales invoice created successfully',
      data: {
        id: saleId,
        customer: body.customer,
        invoiceDate: body.invoiceDate,
        dueDate: body.dueDate,
        total: body.total, // Total is recalculated in Use Case but here we return input or calculate
        paymentMethod: body.paymentMethod,
        status: body.status || 'Pending',
        items: body.items,
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error creating sales invoice:', error);
    if (error.message && error.message.includes('Insufficient stock')) {
      return NextResponse.json(
          { success: false, error: error.message },
          { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: `Failed to create sales invoice: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get('countOnly') === 'true';
    const warehouse = searchParams.get('warehouse');

    // Handle countOnly requests
    if (countOnly && warehouse) {
      const total = await db.salesTransaction.count({
        where: {
          warehouseId: warehouse,
        },
      });
      return NextResponse.json({
        success: true,
        total,
        timestamp: new Date().toISOString()
      });
    }

    const filters = { warehouse };
    const salesInvoices = await getSalesUseCase.execute(filters);

    // Fetch transactions with customer data using Prisma
    const transactions = await db.salesTransaction.findMany({
      where: warehouse ? { warehouseId: warehouse } : {},
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            contactNumber: true,
            paymentTerms: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
              },
            },
          },
        },
      },
    });

    const invoicesWithItems = transactions.map((row) => {
      const customer = row.customer || { name: 'Walk-in Customer' };
      return {
        id: row.id,
        reference: row.reference,
        receiptNo: row.receiptNumber,
        transactionSource: row.transactionSource,
        customer: {
          id: row.customerId || '',
          name: customer.name,
          contactNumber: customer.contactNumber || '',
          paymentTerms: customer.paymentTerms || '',
        },
        invoiceDate: row.invoiceDate,
        dueDate: row.dueDate,
        total: row.total.toNumber(),
        paymentMethod: row.paymentMethod || '',
        paymentReference: row.paymentReference || '',
        status: row.status,
        notes: row.notes,
        orderNumber: row.orderNumber,
        items: row.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price.toNumber(),
          costAtSale: item.costAtSale?.toNumber() || 0,
          product: {
            id: item.product.id,
            name: item.product.name,
            sku: item.product.sku || '',
            barcode: item.product.barcode || ''
          }
        })),
      };
    });

    return NextResponse.json({
      success: true,
      data: invoicesWithItems,
      count: invoicesWithItems.length,
      source: 'sales_invoices'
    });
  } catch (error: any) {
    console.error('Error fetching sales invoices:', error);
    return NextResponse.json(
      { success: false, error: `Failed to fetch sales invoices: ${error.message}` },
      { status: 500 }
    );
  }
}
