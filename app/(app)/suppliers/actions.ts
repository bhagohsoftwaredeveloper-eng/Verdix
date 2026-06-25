'use server';

import { query } from '@/lib/mysql';
import { revalidatePath } from 'next/cache';

export type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+';

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
  totalCreditMemos: number;
  balance: number;
  /** Earliest due_date among unpaid POs (falls back to PO date for pre-migration rows) */
  earliestDueDate?: string;
  /** Positive = days overdue, 0 = due today, negative = days until due */
  daysOverdue?: number;
  agingBucket?: AgingBucket;
  orderSchedule?: string;
};

export type SupplierCreditMemoReason =
  | 'Goods Return'
  | 'Price Adjustment'
  | 'Short Delivery'
  | 'Quality Issue'
  | 'Other';

export type SupplierCreditMemo = {
  id: string;
  supplierId: string;
  purchaseOrderId?: string;
  amount: number;
  date: string;
  reason: SupplierCreditMemoReason;
  reference?: string;
  notes?: string;
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
    let sql = `
      SELECT
        s.*,
        COALESCE(SUM(po.total), 0)           as total_purchases,
        COALESCE(pay.total_payments, 0)       as total_payments,
        COALESCE(cm.total_credit_memos, 0)    as total_credit_memos,
        MIN(CASE WHEN po.status != 'Paid' AND po.total > COALESCE(po.paid_amount, 0)
            THEN COALESCE(po.due_date, DATE(po.date)) END) as earliest_due_date
      FROM suppliers s
      LEFT JOIN purchase_orders po ON s.id = po.supplier_id AND po.status != 'Cancelled'
      LEFT JOIN (
        SELECT supplier_id, SUM(amount) as total_payments
        FROM supplier_payments
        GROUP BY supplier_id
      ) pay ON s.id = pay.supplier_id
      LEFT JOIN (
        SELECT supplier_id, SUM(amount) as total_credit_memos
        FROM supplier_credit_memos
        GROUP BY supplier_id
      ) cm ON s.id = cm.supplier_id
      WHERE 1=1
    `;
    
    const params: any[] = [];

    if (search) {
      sql += ` AND (s.name LIKE ? OR s.company LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (filters?.paymentTerms) {
      sql += ` AND s.payment_terms = ?`;
      params.push(filters.paymentTerms);
    }

    if (filters?.orderSchedule) {
      sql += ` AND s.order_schedule LIKE ?`;
      params.push(`%${filters.orderSchedule}%`);
    }

    if (filters?.company) {
      sql += ` AND s.company LIKE ?`;
      params.push(`%${filters.company}%`);
    }

    sql += ` GROUP BY s.id`;

    // Filter by balance if requested (balance = purchases - payments - credit_memos)
    if (filters?.hasBalance || filters?.minBalance !== undefined || filters?.maxBalance !== undefined) {
        sql = `SELECT * FROM (${sql}) as t WHERE 1=1`;
        if (filters.hasBalance) {
            sql += ` AND (total_purchases - total_payments - total_credit_memos) > 0`;
        }
        if (filters.minBalance !== undefined) {
            sql += ` AND (total_purchases - total_payments - total_credit_memos) >= ?`;
            params.push(filters.minBalance);
        }
        if (filters.maxBalance !== undefined) {
            sql += ` AND (total_purchases - total_payments - total_credit_memos) <= ?`;
            params.push(filters.maxBalance);
        }
    }

    sql += ` ORDER BY name ASC`;

    const rows = await query(sql, params);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const MS_PER_DAY = 24 * 60 * 60 * 1000;

    return rows.map((row: any) => {
      const totalPurchases = parseFloat(row.total_purchases);
      const totalPayments = parseFloat(row.total_payments);
      const totalCreditMemos = parseFloat(row.total_credit_memos || '0');

      // Normalise the date value MySQL returns (Date object or string)
      const rawDue = row.earliest_due_date;
      let earliestDueDate: string | undefined;
      if (rawDue) {
        earliestDueDate = rawDue instanceof Date
          ? rawDue.toISOString().slice(0, 10)
          : String(rawDue).slice(0, 10);
      }

      let daysOverdue: number | undefined;
      let agingBucket: AgingBucket | undefined;
      if (earliestDueDate) {
        const dueMs = new Date(earliestDueDate + 'T00:00:00').getTime();
        daysOverdue = Math.floor((today.getTime() - dueMs) / MS_PER_DAY);
        if (daysOverdue <= 0) agingBucket = 'current';
        else if (daysOverdue <= 30) agingBucket = '1-30';
        else if (daysOverdue <= 60) agingBucket = '31-60';
        else if (daysOverdue <= 90) agingBucket = '61-90';
        else agingBucket = '90+';
      }

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
        totalPurchases,
        totalPayments,
        totalCreditMemos,
        balance: totalPurchases - totalPayments - totalCreditMemos,
        earliestDueDate,
        daysOverdue,
        agingBucket,
        orderSchedule: row.order_schedule,
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
        due_date,
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
      ORDER BY COALESCE(due_date, date) ASC
    `;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rows = await query(sql, [supplierId]);
    return rows.map((row: any) => {
      const rawDue = row.due_date;
      const dueDate = rawDue
        ? (rawDue instanceof Date ? rawDue.toISOString().slice(0, 10) : String(rawDue).slice(0, 10))
        : null;
      const isOverdue = dueDate ? new Date(dueDate + 'T00:00:00') < today : false;
      return {
        id: row.id,
        date: row.date,
        dueDate,
        isOverdue,
        total: parseFloat(row.total),
        paidAmount: parseFloat(row.paid_amount),
        balance: parseFloat(row.balance),
        status: row.status,
        referenceNumber: row.reference_number,
      };
    });
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
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        sp.*,
        s.name as supplier_name
      FROM supplier_payments sp
      JOIN suppliers s ON sp.supplier_id = s.id
      WHERE 1=1
    `;
    
    const params: any[] = [];

    if (searchTerm) {
      sql += ` AND (s.name LIKE ? OR sp.reference LIKE ?)`;
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    if (from) {
      sql += ` AND sp.date >= ?`;
      params.push(from);
    }

    if (to) {
      sql += ` AND sp.date <= ?`;
      params.push(to);
    }

    if (paymentMethod && paymentMethod !== 'All') {
      sql += ` AND sp.payment_method = ?`;
      params.push(paymentMethod);
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) as sub`;
    const countResult: any = await query(countSql, params);
    const total = countResult[0]?.total || 0;

    sql += ` ORDER BY sp.date DESC, sp.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const payments = await query(sql, params);

    const data = payments.map((p: any) => ({
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
  type: 'PURCHASE' | 'PAYMENT' | 'CREDIT_MEMO';
  date: string;
  /** Payment due date (PO transactions only) */
  dueDate?: string;
  reference?: string;
  description: string;
  amount: number;
  status?: string;
  paidAmount?: number;
  balance?: number;
  /** Running accounts-payable balance after this transaction */
  runningBalance?: number;
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
    // 1. Fetch all Purchase Orders for this supplier (ASC for running-balance computation)
    const purchasesSql = `
      SELECT
        id,
        date,
        due_date,
        total as amount,
        paid_amount,
        status,
        reference_number
      FROM purchase_orders
      WHERE supplier_id = ? AND status != 'Cancelled'
      ORDER BY date ASC
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

    // 3b. Fetch credit memos (goods returns / price adjustments)
    const creditMemosSql = `
      SELECT
        id,
        date,
        amount,
        reason,
        reference,
        notes,
        purchase_order_id
      FROM supplier_credit_memos
      WHERE supplier_id = ?
      ORDER BY date ASC
    `;
    const creditMemos = await query(creditMemosSql, [supplierId]);

    // 4. Build flat event list to compute running AP balance chronologically
    // DEBIT = PO (we owe more), CREDIT = payment or credit memo (we owe less)
    type BalanceEvent = { date: string; id: string; isDebit: boolean; amount: number };
    const balanceEvents: BalanceEvent[] = [];
    for (const po of purchases) {
      balanceEvents.push({ date: po.date, id: po.id, isDebit: true, amount: parseFloat(po.amount) });
    }
    for (const payment of allPayments) {
      balanceEvents.push({ date: payment.date, id: payment.id, isDebit: false, amount: parseFloat(payment.amount) });
    }
    for (const cm of creditMemos) {
      balanceEvents.push({ date: cm.date, id: cm.id, isDebit: false, amount: parseFloat(cm.amount) });
    }
    balanceEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const runningBalanceMap = new Map<string, number>();
    let runningBal = 0;
    for (const ev of balanceEvents) {
      runningBal += ev.isDebit ? ev.amount : -ev.amount;
      runningBalanceMap.set(ev.id, runningBal);
    }

    // Map allocations to POs
    const transactions: SupplierTransaction[] = purchases.map((po: any) => {
      const rawDue = po.due_date;
      const dueDate = rawDue
        ? (rawDue instanceof Date ? rawDue.toISOString().slice(0, 10) : String(rawDue).slice(0, 10))
        : undefined;

      const poAllocations = allocations
        .filter((alloc: any) => alloc.purchase_order_id === po.id)
        .map((alloc: any) => ({
          id: alloc.id,
          date: alloc.date,
          amount: parseFloat(alloc.amount),
          reference: alloc.reference,
          paymentMethod: alloc.payment_method,
        }));

      return {
        id: po.id,
        type: 'PURCHASE' as const,
        date: po.date,
        dueDate,
        amount: parseFloat(po.amount),
        description: po.reference_number ? `PO #${po.reference_number}` : 'Purchase Order',
        status: po.status,
        reference: po.reference_number || po.id,
        paidAmount: parseFloat(po.paid_amount),
        balance: parseFloat(po.amount) - parseFloat(po.paid_amount),
        runningBalance: runningBalanceMap.get(po.id),
        payments: poAllocations,
      };
    });

    // 5. Find payments that are NOT fully allocated
    const unallocatedPayments: SupplierTransaction[] = [];

    for (const payment of allPayments) {
      const paymentAllocations = allocations.filter((alloc: any) => alloc.id === payment.id);
      const allocatedTotal = paymentAllocations.reduce((sum: number, alloc: any) => sum + parseFloat(alloc.amount), 0);
      const unallocatedAmount = parseFloat(payment.amount) - allocatedTotal;

      if (unallocatedAmount > 0.01) {
        unallocatedPayments.push({
          id: payment.id,
          type: 'PAYMENT' as const,
          date: payment.date,
          amount: parseFloat(payment.amount),
          description: `Payment - ${payment.payment_method} (Unallocated: ₱${unallocatedAmount.toLocaleString()})`,
          reference: payment.reference,
          paidAmount: allocatedTotal,
          balance: unallocatedAmount,
          runningBalance: runningBalanceMap.get(payment.id),
        });
      } else if (paymentAllocations.length === 0) {
        unallocatedPayments.push({
          id: payment.id,
          type: 'PAYMENT' as const,
          date: payment.date,
          amount: parseFloat(payment.amount),
          description: `Payment - ${payment.payment_method} (Unallocated)`,
          reference: payment.reference,
          balance: parseFloat(payment.amount),
          runningBalance: runningBalanceMap.get(payment.id),
        });
      }
    }

    // 6. Map credit memos as CREDIT_MEMO transactions
    const creditMemoTxns: SupplierTransaction[] = creditMemos.map((cm: any) => ({
      id: cm.id,
      type: 'CREDIT_MEMO' as const,
      date: cm.date instanceof Date ? cm.date.toISOString().slice(0, 10) : String(cm.date).slice(0, 10),
      amount: parseFloat(cm.amount),
      description: `Credit Memo — ${cm.reason}${cm.purchase_order_id ? ` (linked to PO)` : ''}`,
      reference: cm.reference,
      runningBalance: runningBalanceMap.get(cm.id),
    }));

    // Combine and sort newest-first for display
    const result = [...transactions, ...unallocatedPayments, ...creditMemoTxns];
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  } catch (error) {
    console.error('Error fetching supplier transactions:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Credit Memos
// ---------------------------------------------------------------------------

export async function addSupplierCreditMemo(data: {
  supplierId: string;
  purchaseOrderId?: string;
  amount: number;
  date: string;
  reason: SupplierCreditMemoReason;
  reference?: string;
  notes?: string;
}) {
  try {
    const id = `scm_${Date.now()}`;
    await query(
      `INSERT INTO supplier_credit_memos
         (id, supplier_id, purchase_order_id, amount, date, reason, reference, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.supplierId,
        data.purchaseOrderId || null,
        data.amount,
        data.date,
        data.reason,
        data.reference || null,
        data.notes || null,
      ],
    );
    revalidatePath('/suppliers/balance');
    return { success: true, id };
  } catch (error) {
    console.error('Error adding credit memo:', error);
    return { success: false, message: 'Failed to record credit memo' };
  }
}

export async function getSupplierAllPOs(supplierId: string) {
  try {
    const rows = await query(
      `SELECT id, reference_number, date, total, status
       FROM purchase_orders
       WHERE supplier_id = ? AND status != 'Cancelled'
       ORDER BY date DESC`,
      [supplierId],
    );
    return rows.map((r: any) => ({
      id: r.id,
      referenceNumber: r.reference_number,
      date: r.date,
      total: parseFloat(r.total),
      status: r.status,
    }));
  } catch (error) {
    console.error('Error fetching supplier POs:', error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Advance Credit
// ---------------------------------------------------------------------------

export async function getSupplierAdvanceCredit(supplierId: string): Promise<number> {
  try {
    const rows = await query(
      `SELECT
         COALESCE(SUM(sp.amount), 0) - COALESCE(SUM(pop.amount), 0) as advance_credit
       FROM supplier_payments sp
       LEFT JOIN purchase_order_payments pop ON sp.id = pop.supplier_payment_id
       WHERE sp.supplier_id = ?`,
      [supplierId],
    );
    return Math.max(0, parseFloat(rows[0]?.advance_credit ?? '0'));
  } catch (error) {
    console.error('Error fetching advance credit:', error);
    return 0;
  }
}
