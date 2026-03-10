'use server';

import { query } from '@/lib/mysql';
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
  oldestInvoiceDate?: string;
  orderSchedule?: string;
};

export async function getSuppliersWithBalance(search?: string): Promise<SupplierWithBalance[]> {
  try {
    let sql = `
      SELECT 
        s.*,
        COALESCE(SUM(po.total), 0) as total_purchases,
        COALESCE(pay.total_payments, 0) as total_payments,
        MIN(CASE WHEN po.status != 'Paid' AND po.total > COALESCE(po.paid_amount, 0) THEN po.date END) as oldest_invoice_date
      FROM suppliers s
      LEFT JOIN purchase_orders po ON s.id = po.supplier_id AND po.status != 'Cancelled'
      LEFT JOIN (
        SELECT supplier_id, SUM(amount) as total_payments
        FROM supplier_payments
        GROUP BY supplier_id
      ) pay ON s.id = pay.supplier_id
      WHERE 1=1
    `;
    
    const params: any[] = [];

    if (search) {
      sql += ` AND s.name LIKE ?`;
      params.push(`%${search}%`);
    }

    sql += ` GROUP BY s.id ORDER BY s.name ASC`;

    const rows = await query(sql, params);

    return rows.map((row: any) => {
      const totalPurchases = parseFloat(row.total_purchases);
      const totalPayments = parseFloat(row.total_payments);
      return {
        id: row.id,
        name: row.name,
        contactNumber: row.contact_number,
        telephone: row.telephone,
        mobilePhone: row.mobile_phone,
        email: row.email,
        address: row.address,
        company: row.company,
        tin: row.tin,
        paymentTerms: row.payment_terms,
        markupPercentage: row.markup_percentage ? parseFloat(row.markup_percentage) : undefined,
        totalPurchases: totalPurchases,
        totalPayments: totalPayments,
        balance: totalPurchases - totalPayments,
        oldestInvoiceDate: row.oldest_invoice_date,
        orderSchedule: row.order_schedule
      };
    });
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
    
    // Start transaction for atomic updates
    await query('START TRANSACTION', []);

    try {
      const sql = `
        INSERT INTO supplier_payments (
          id, supplier_id, amount, date, payment_method, reference, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      await query(sql, [
        paymentId,
        data.supplierId,
        data.amount,
        data.date,
        data.paymentMethod,
        data.reference || null,
        data.notes || null,
      ]);

      // Handle allocations if any
      if (data.allocations && data.allocations.length > 0) {
        for (const allocation of data.allocations) {
          const allocId = `spa_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          
          // Link payment to PO
          await query(`
            INSERT INTO purchase_order_payments (id, supplier_payment_id, purchase_order_id, amount)
            VALUES (?, ?, ?, ?)
          `, [allocId, paymentId, allocation.purchaseOrderId, allocation.amount]);

          // Update PO paid_amount and status
          await query(`
            UPDATE purchase_orders 
            SET paid_amount = paid_amount + ?
            WHERE id = ?
          `, [allocation.amount, allocation.purchaseOrderId]);

          // Check if fully paid and update status
          const [po]: any = await query(`SELECT total, paid_amount FROM purchase_orders WHERE id = ?`, [allocation.purchaseOrderId]);
          if (po && po.paid_amount >= po.total) {
            await query(`UPDATE purchase_orders SET status = 'Paid' WHERE id = ?`, [allocation.purchaseOrderId]);
          } else if (po && po.paid_amount > 0) {
            await query(`UPDATE purchase_orders SET status = 'Partially Paid' WHERE id = ?`, [allocation.purchaseOrderId]);
          }
        }
      }

      await query('COMMIT', []);
    } catch (err) {
      await query('ROLLBACK', []);
      throw err;
    }

    // Sync to external accounting API (non-blocking) - simplified for brevity here
    // ... preserved existing sync logic ...
    try {
      const { getExternalApiConfig } = await import('@/lib/external-api-config');
      const { syncPaymentTransaction, syncAccountsPayable } = await import('@/lib/services/external-accounting-api');
      
      const apiConfig = await getExternalApiConfig();
      if (apiConfig.enabled) {
        const supplierQuery = await query('SELECT name FROM suppliers WHERE id = ?', [data.supplierId]);
        const supplierName = supplierQuery[0]?.name || '';

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
    const sql = `
      SELECT 
        id, 
        date, 
        total, 
        COALESCE(paid_amount, 0) as paid_amount,
        (total - COALESCE(paid_amount, 0)) as balance,
        status,
        reference_number
      FROM purchase_orders
      WHERE supplier_id = ? 
      AND status != 'Cancelled' 
      AND status != 'Paid'
      AND total > COALESCE(paid_amount, 0)
      ORDER BY date ASC
    `;
    
    const rows = await query(sql, [supplierId]);
    return rows.map((row: any) => ({
      id: row.id,
      date: row.date,
      total: parseFloat(row.total),
      paidAmount: parseFloat(row.paid_amount),
      balance: parseFloat(row.balance),
      status: row.status,
      referenceNumber: row.reference_number
    }));
  } catch (error) {
    console.error('Error fetching unpaid POs:', error);
    return [];
  }
}

export async function getSupplierPayments(searchTerm?: string) {
  try {
    let sql = `
      SELECT 
        sp.*,
        s.name as supplier_name
      FROM supplier_payments sp
      JOIN suppliers s ON sp.supplier_id = s.id
    `;
    
    const params: any[] = [];

    if (searchTerm) {
      sql += ` WHERE s.name LIKE ? OR sp.reference LIKE ?`;
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    sql += ` ORDER BY sp.date DESC, sp.created_at DESC`;

    const payments = await query(sql, params);

    return payments.map((p: any) => ({
      id: p.id,
      supplierId: p.supplier_id,
      supplierName: p.supplier_name,
      amount: parseFloat(p.amount),
      date: p.date,
      paymentMethod: p.payment_method,
      reference: p.reference,
      notes: p.notes,
      createdAt: p.created_at
    }));
  } catch (error) {
    console.error('Error fetching supplier payments:', error);
    return [];
  }
}

export type SupplierTransaction = {
  id: string;
  type: 'PURCHASE' | 'PAYMENT';
  date: string;
  reference?: string;
  description: string;
  amount: number;
  status?: string;
  paidAmount?: number;
  balance?: number;
  payments?: {
    id: string;
    date: string;
    amount: number;
    reference?: string;
    paymentMethod: string;
  }[];
};

export async function getSupplierTransactions(supplierId: string): Promise<SupplierTransaction[]> {
  try {
    // 1. Fetch all Purchase Orders for this supplier
    const purchasesSql = `
      SELECT 
        id, 
        date, 
        total as amount, 
        paid_amount,
        status,
        reference_number
      FROM purchase_orders 
      WHERE supplier_id = ? AND status != 'Cancelled'
      ORDER BY date DESC
    `;
    const purchases = await query(purchasesSql, [supplierId]);

    // 2. Fetch all payment allocations for these POs
    const allocationsSql = `
      SELECT 
        pop.purchase_order_id,
        sp.id,
        sp.date,
        pop.amount,
        sp.reference,
        sp.payment_method
      FROM purchase_order_payments pop
      JOIN supplier_payments sp ON pop.supplier_payment_id = sp.id
      WHERE sp.supplier_id = ?
      ORDER BY sp.date DESC
    `;
    const allocations = await query(allocationsSql, [supplierId]);

    // 3. Fetch all payments to find unallocated ones
    const allPaymentsSql = `
      SELECT 
        id, 
        date, 
        amount, 
        payment_method,
        reference
      FROM supplier_payments 
      WHERE supplier_id = ?
      ORDER BY date DESC
    `;
    const allPayments = await query(allPaymentsSql, [supplierId]);

    // Map allocations to POs
    const transactions: SupplierTransaction[] = purchases.map((po: any) => {
      const poAllocations = allocations
        .filter((alloc: any) => alloc.purchase_order_id === po.id)
        .map((alloc: any) => ({
          id: alloc.id,
          date: alloc.date,
          amount: parseFloat(alloc.amount),
          reference: alloc.reference,
          paymentMethod: alloc.payment_method
        }));

      return {
        id: po.id,
        type: 'PURCHASE' as const,
        date: po.date,
        amount: parseFloat(po.amount),
        description: po.reference_number ? `PO #${po.reference_number}` : 'Purchase Order',
        status: po.status,
        reference: po.reference_number || po.id,
        paidAmount: parseFloat(po.paid_amount),
        balance: parseFloat(po.amount) - parseFloat(po.paid_amount),
        payments: poAllocations
      };
    });

    // 4. Find payments that are NOT fully allocated or even partially (though usually they should be)
    // Actually, let's just find payments where the sum of allocations < payment amount
    const unallocatedPayments: SupplierTransaction[] = [];
    
    for (const payment of allPayments) {
      const paymentAllocations = allocations.filter((alloc: any) => alloc.id === payment.id);
      const allocatedTotal = paymentAllocations.reduce((sum: number, alloc: any) => sum + parseFloat(alloc.amount), 0);
      const unallocatedAmount = parseFloat(payment.amount) - allocatedTotal;

      if (unallocatedAmount > 0.01) { // Floating point safety
        unallocatedPayments.push({
          id: payment.id,
          type: 'PAYMENT' as const,
          date: payment.date,
          amount: parseFloat(payment.amount),
          description: `Payment - ${payment.payment_method} (Unallocated: ₱${unallocatedAmount.toLocaleString()})`,
          reference: payment.reference,
          paidAmount: allocatedTotal,
          balance: unallocatedAmount
        });
      } else if (paymentAllocations.length === 0) {
        // Payment with NO allocations at all
        unallocatedPayments.push({
          id: payment.id,
          type: 'PAYMENT' as const,
          date: payment.date,
          amount: parseFloat(payment.amount),
          description: `Payment - ${payment.payment_method} (Unallocated)`,
          reference: payment.reference,
          balance: parseFloat(payment.amount)
        });
      }
    }

    // Combine POs and Unallocated Payments
    const result = [...transactions, ...unallocatedPayments];

    // Sort by date descending
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  } catch (error) {
    console.error('Error fetching supplier transactions:', error);
    return [];
  }
}
