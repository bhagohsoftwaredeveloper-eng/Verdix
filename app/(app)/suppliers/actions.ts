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
  orderSchedule?: string;
};

export async function getSuppliersWithBalance(search?: string): Promise<SupplierWithBalance[]> {
  try {
    let sql = `
      SELECT 
        s.*,
        COALESCE(SUM(po.total), 0) as total_purchases,
        COALESCE(pay.total_payments, 0) as total_payments
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
}) {
  try {
    const paymentId = `sp_${Date.now()}`;
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

    revalidatePath('/purchases/suppliers');
    return { success: true, message: 'Payment recorded successfully' };
  } catch (error) {
    console.error('Error recording supplier payment:', error);
    return { success: false, message: 'Failed to record payment' };
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
};

export async function getSupplierTransactions(supplierId: string): Promise<SupplierTransaction[]> {
  try {
    // Fetch Purchases (Purchase Orders)
    const purchasesSql = `
      SELECT 
        id, 
        date, 
        total as amount, 
        status,
        'Purchase Order' as description 
      FROM purchase_orders 
      WHERE supplier_id = ? AND status != 'Cancelled'
    `;
    const purchases = await query(purchasesSql, [supplierId]);

    // Fetch Payments
    const paymentsSql = `
      SELECT 
        id, 
        date, 
        amount, 
        payment_method as description,
        reference
      FROM supplier_payments 
      WHERE supplier_id = ?
    `;
    const payments = await query(paymentsSql, [supplierId]);

    // Combine and standardize
    const transactions: SupplierTransaction[] = [
      ...purchases.map((p: any) => ({
        id: p.id,
        type: 'PURCHASE' as const,
        date: p.date,
        amount: parseFloat(p.amount),
        description: `Purchase Order`, // Maybe improve if we had PO number usage
        status: p.status,
        reference: p.id // Use ID as reference for now typically PO ID
      })),
      ...payments.map((p: any) => ({
        id: p.id,
        type: 'PAYMENT' as const,
        date: p.date, // Payment date is typically YYYY-MM-DD string or datetime
        amount: parseFloat(p.amount),
        description: `Payment - ${p.description}`,
        reference: p.reference
      }))
    ];

    // Sort by date descending
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  } catch (error) {
    console.error('Error fetching supplier transactions:', error);
    return [];
  }
}
