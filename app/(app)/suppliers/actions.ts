'use server';

import { db } from '@/lib/db';
import { withTransaction } from '@/lib/db-helpers';
import { revalidatePath } from 'next/cache';

export type SupplierWithBalance = {
  id: string;
  name: string;
  contactNumber?: string;
  telephone?: string;
  mobilePhone?: string;
  email?: string;
  address?: string;
  company?: string;
  tin?: string;
  paymentTerms?: string;
  markupPercentage?: number;
  totalPurchases: number;
  totalPayments: number;
  balance: number;
  oldestInvoiceDate?: Date;
  orderSchedule?: string;
};

export type SupplierFilters = {
  paymentTerms?: string;
  orderSchedule?: string;
  company?: string;
  hasBalance?: boolean;
  minBalance?: number;
  maxBalance?: number;
};

export async function getSuppliersWithBalance(search?: string, filters?: SupplierFilters): Promise<SupplierWithBalance[]> {
  try {
    const suppliers = await db.supplier.findMany({
      where: {
        AND: [
          search ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { company: { contains: search, mode: 'insensitive' } },
            ]
          } : {},
          filters?.paymentTerms ? { paymentTerms: filters.paymentTerms } : {},
          filters?.orderSchedule ? { orderSchedule: { contains: filters.orderSchedule, mode: 'insensitive' } } : {},
          filters?.company ? { company: { contains: filters.company, mode: 'insensitive' } } : {},
        ]
      },
      orderBy: { name: 'asc' }
    });

    const purchases = await db.purchaseOrder.groupBy({
      by: ['supplierId'],
      _sum: { total: true },
      where: { status: { not: 'Cancelled' as any } }
    });

    const payments = await db.supplierPayment.groupBy({
      by: ['supplierId'],
      _sum: { amount: true }
    });

    const oldestInvoices = await db.purchaseOrder.findMany({
      where: {
        status: { notIn: ['Paid' as any, 'Cancelled' as any] },
      },
      select: { supplierId: true, date: true, total: true, paidAmount: true },
      orderBy: { date: 'asc' }
    });

    const purchaseMap = new Map(purchases.map(p => [p.supplierId, Number(p._sum.total || 0)]));
    const paymentMap = new Map(payments.map(p => [p.supplierId, Number(p._sum.amount || 0)]));
    
    // Group oldest invoices by supplier
    const oldestInvoiceMap = new Map<string, Date>();
    for (const inv of oldestInvoices) {
      if (!oldestInvoiceMap.has(inv.supplierId)) {
        if (Number(inv.total) > Number(inv.paidAmount || 0)) {
          oldestInvoiceMap.set(inv.supplierId, inv.date);
        }
      }
    }

    let result = suppliers.map((s) => {
      const totalPurchases = purchaseMap.get(s.id) || 0;
      const totalPayments = paymentMap.get(s.id) || 0;
      return {
        id: s.id,
        name: s.name,
        contactNumber: s.contactNumber || undefined,
        telephone: s.telephone || undefined,
        mobilePhone: s.mobilePhone || undefined,
        email: s.email || undefined,
        address: s.address || undefined,
        company: s.company || undefined,
        tin: s.tin || undefined,
        paymentTerms: s.paymentTerms || undefined,
        markupPercentage: s.markupPercentage ? Number(s.markupPercentage) : undefined,
        totalPurchases,
        totalPayments,
        balance: totalPurchases - totalPayments,
        oldestInvoiceDate: oldestInvoiceMap.get(s.id),
        orderSchedule: s.orderSchedule || undefined
      };
    });

    // Apply balance filters
    if (filters?.hasBalance) {
      result = result.filter(r => r.balance > 0);
    }
    if (filters?.minBalance !== undefined) {
      result = result.filter(r => r.balance >= filters.minBalance!);
    }
    if (filters?.maxBalance !== undefined) {
      result = result.filter(r => r.balance <= filters.maxBalance!);
    }

    return result;
  } catch (error) {
    console.error('Error fetching suppliers with balance:', error);
    return [];
  }
}

export async function addSupplierPayment(data: {
  supplierId: string;
  amount: number;
  date: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  allocations?: { purchaseOrderId: string; amount: number }[];
}) {
  try {
    const paymentId = `sp_${Date.now()}`;
    
    await withTransaction(async (tx) => {
      await tx.supplierPayment.create({
        data: {
          id: paymentId,
          supplierId: data.supplierId,
          amount: data.amount,
          date: new Date(data.date),
          paymentMethod: data.paymentMethod,
          reference: data.reference || null,
          notes: data.notes || null,
        }
      });

      // Handle allocations if any
      if (data.allocations && data.allocations.length > 0) {
        for (const allocation of data.allocations) {
          const allocId = `spa_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          
          // Link payment to PO (using raw since it's missing from schema)
          await tx.$executeRaw`
            INSERT INTO purchase_order_payments (id, supplier_payment_id, purchase_order_id, amount)
            VALUES (${allocId}, ${paymentId}, ${allocation.purchaseOrderId}, ${allocation.amount})
          `;

          // Update PO paid_amount and status
          const po = await tx.purchaseOrder.findUnique({
            where: { id: allocation.purchaseOrderId },
            select: { total: true, paidAmount: true }
          });

          if (po) {
            const newPaidAmount = Number(po.paidAmount) + allocation.amount;
            let newStatus = po.status;
            
            if (newPaidAmount >= Number(po.total)) {
              newStatus = 'Paid' as any;
            } else if (newPaidAmount > 0) {
              newStatus = 'PartiallyPaid' as any;
            }

            await tx.purchaseOrder.update({
              where: { id: allocation.purchaseOrderId },
              data: { 
                paidAmount: newPaidAmount,
                status: newStatus
              }
            });
          }
        }
      }
    });

    // Sync to external accounting API (non-blocking)
    try {
      const { getExternalApiConfig } = await import('@/lib/external-api-config');
      const { syncPaymentTransaction, syncAccountsPayable } = await import('@/lib/services/external-accounting-api');
      
      const apiConfig = await getExternalApiConfig();
      if (apiConfig.enabled) {
        const supplier = await db.supplier.findUnique({
          where: { id: data.supplierId },
          select: { name: true }
        });
        const supplierName = supplier?.name || '';

        const paymentData = {
          id: paymentId,
          supplierId: data.supplierId,
          supplierName,
          amount: data.amount,
          date: data.date,
          paymentMethod: data.paymentMethod,
          reference: data.reference,
          notes: data.notes,
          allocations: data.allocations
        };

        syncPaymentTransaction(paymentId, paymentData, apiConfig).catch(err => {
          console.error('External API payment sync failed (non-blocking):', err);
        });

        syncAccountsPayable(data.supplierId, apiConfig).catch(err => {
          console.error('External API accounts payable sync failed (non-blocking):', err);
        });
      }
    } catch (error) {
      console.error('Error triggering external API sync:', error);
    }

    revalidatePath('/suppliers/balance');
    revalidatePath('/purchases/suppliers');
    return { success: true, message: 'Payment recorded successfully' };
  } catch (error) {
    console.error('Error recording supplier payment:', error);
    return { success: false, message: 'Failed to record payment' };
  }
}

export async function getUnpaidPurchaseOrders(supplierId: string) {
  try {
    const pos = await db.purchaseOrder.findMany({
      where: {
        supplierId,
        status: { notIn: ['Cancelled' as any, 'Paid' as any] },
      },
      orderBy: { date: 'asc' }
    });

    return pos
      .filter(po => Number(po.total) > Number(po.paidAmount || 0))
      .map((row) => ({
        id: row.id,
        date: row.date,
        total: Number(row.total),
        paidAmount: Number(row.paidAmount || 0),
        balance: Number(row.total) - Number(row.paidAmount || 0),
        status: row.status,
        referenceNumber: row.referenceNumber
      }));
  } catch (error) {
    console.error('Error fetching unpaid POs:', error);
    return [];
  }
}

export async function getSupplierPayments(options: {
  searchTerm?: string;
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  paymentMethod?: string;
} = {}) {
  try {
    const { searchTerm, page = 1, limit = 10, from, to, paymentMethod } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      AND: [
        searchTerm ? {
          OR: [
            { supplier: { name: { contains: searchTerm, mode: 'insensitive' } } },
            { reference: { contains: searchTerm, mode: 'insensitive' } },
          ]
        } : {},
        from ? { date: { gte: new Date(from) } } : {},
        to ? { date: { lte: new Date(to) } } : {},
        (paymentMethod && paymentMethod !== 'All') ? { paymentMethod } : {},
      ]
    };

    const total = await db.supplierPayment.count({ where });

    const payments = await db.supplierPayment.findMany({
      where,
      include: { supplier: { select: { name: true } } },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: skip
    });

    const data = payments.map((p) => ({
      id: p.id,
      supplierId: p.supplierId,
      supplierName: p.supplier?.name,
      amount: Number(p.amount),
      date: p.date,
      paymentMethod: p.paymentMethod,
      reference: p.reference,
      notes: p.notes,
      createdAt: p.createdAt
    }));

    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error fetching supplier payments:', error);
    return { success: false, data: [], error: 'Failed to fetch payments' };
  }
}

export type SupplierTransaction = {
  id: string;
  type: 'PURCHASE' | 'PAYMENT';
  date: Date;
  reference?: string;
  description: string;
  amount: number;
  status?: string;
  paidAmount?: number;
  balance?: number;
  payments?: {
    id: string;
    date: Date;
    amount: number;
    reference?: string;
    paymentMethod: string;
  }[];
};

export async function getSupplierTransactions(supplierId: string): Promise<SupplierTransaction[]> {
  try {
    // 1. Fetch all Purchase Orders for this supplier
    const purchases = await db.purchaseOrder.findMany({
      where: {
        supplierId,
        status: { not: 'Cancelled' as any }
      },
      orderBy: { date: 'desc' }
    });

    // 2. Fetch all payment allocations for these POs
    // Using raw since purchase_order_payments is missing from schema
    const allocations: any[] = await db.$queryRaw`
      SELECT 
        pop.purchase_order_id,
        sp.id,
        sp.date,
        pop.amount,
        sp.reference,
        sp.payment_method
      FROM purchase_order_payments pop
      JOIN supplier_payments sp ON pop.supplier_payment_id = sp.id
      WHERE sp.supplier_id = ${supplierId}
      ORDER BY sp.date DESC
    `;

    // 3. Fetch all payments to find unallocated ones
    const allPayments = await db.supplierPayment.findMany({
      where: { supplierId },
      orderBy: { date: 'desc' }
    });

    // Map allocations to POs
    const transactions: SupplierTransaction[] = purchases.map((po) => {
      const poAllocations = allocations
        .filter((alloc: any) => alloc.purchase_order_id === po.id)
        .map((alloc: any) => ({
          id: alloc.id,
          date: new Date(alloc.date),
          amount: Number(alloc.amount),
          reference: alloc.reference,
          paymentMethod: alloc.payment_method
        }));

      return {
        id: po.id,
        type: 'PURCHASE' as const,
        date: po.date,
        amount: Number(po.total),
        description: po.referenceNumber ? `PO #${po.referenceNumber}` : 'Purchase Order',
        status: po.status,
        reference: po.referenceNumber || po.id,
        paidAmount: Number(po.paidAmount || 0),
        balance: Number(po.total) - Number(po.paidAmount || 0),
        payments: poAllocations
      };
    });

    // 4. Find payments that are NOT fully allocated
    const unallocatedPayments: SupplierTransaction[] = [];
    
    for (const payment of allPayments) {
      const paymentAllocations = allocations.filter((alloc: any) => alloc.id === payment.id);
      const allocatedTotal = paymentAllocations.reduce((sum: number, alloc: any) => sum + Number(alloc.amount), 0);
      const unallocatedAmount = Number(payment.amount) - allocatedTotal;

      if (unallocatedAmount > 0.01) {
        unallocatedPayments.push({
          id: payment.id,
          type: 'PAYMENT' as const,
          date: payment.date,
          amount: Number(payment.amount),
          description: `Payment - ${payment.paymentMethod} (Unallocated: ₱${unallocatedAmount.toLocaleString()})`,
          reference: payment.reference || undefined,
          paidAmount: allocatedTotal,
          balance: unallocatedAmount
        });
      } else if (paymentAllocations.length === 0) {
        unallocatedPayments.push({
          id: payment.id,
          type: 'PAYMENT' as const,
          date: payment.date,
          amount: Number(payment.amount),
          description: `Payment - ${payment.paymentMethod} (Unallocated)`,
          reference: payment.reference || undefined,
          balance: Number(payment.amount)
        });
      }
    }

    const result = [...transactions, ...unallocatedPayments];
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  } catch (error) {
    console.error('Error fetching supplier transactions:', error);
    return [];
  }
}
