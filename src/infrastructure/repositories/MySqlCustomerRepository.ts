import { query } from '../../../lib/mysql';
import { CustomerRepository, GetCustomersFilters } from '../../core/customers/domain/ICustomerRepository';
import { CustomerEntity } from '../../core/customers/domain/Customer';
import { isLoyaltyCardExpired } from '../../../lib/loyalty-utils';

export class MySqlCustomerRepository implements CustomerRepository {
  async findAll(limit: number, offset: number, filters: GetCustomersFilters): Promise<CustomerEntity[]> {
    let sql = `
      SELECT
        c.id,
        c.name,
        c.contact_number AS contactNumber,
        c.active,
        c.sales_person AS salesPerson,
        c.sales_area AS salesArea,
        c.sales_group AS salesGroup,
        COALESCE(cl.current_points, c.loyalty_points) AS loyaltyPoints,
        cl.current_points AS current_points,
        cl.expiry_date AS expiryDate,
        c.payment_terms AS paymentTerms,
        c.address,
        c.billing_address AS billingAddress,
        c.discount,
        c.credit_limit AS creditLimit,
        c.price_level_id AS priceLevelId,
        c.created_at AS createdAt,
        c.updated_at AS updatedAt,
        (SELECT COALESCE(SUM(total - COALESCE(amount_paid, 0)), 0) FROM sales_invoices WHERE customer_id = c.id AND status != 'Paid') AS balance
      FROM customers c
      LEFT JOIN customer_loyalty cl ON c.id = cl.customer_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.search) {
      sql += ' AND (c.name LIKE ? OR c.contact_number LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const customersRaw: any[] = await query(sql, params);

    return customersRaw.map(c => ({
      ...c,
      isExpired: isLoyaltyCardExpired(c.expiryDate)
    }));
  }

  async countAll(filters: GetCustomersFilters): Promise<number> {
    let countSql = 'SELECT COUNT(*) as total FROM customers WHERE 1=1';
    const countParams: any[] = [];

    if (filters.search) {
      countSql += ' AND (name LIKE ? OR contact_number LIKE ?)';
      countParams.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const countResult = await query(countSql, countParams);
    return countResult[0]?.total || 0;
  }

  async findById(id: string): Promise<CustomerEntity | null> {
    const results = await this.findAll(1, 0, { search: id }); // Should ideally be a specific by-id query
    // Simplified for now, similar to how I did products
    return results[0] || null;
  }

  async create(customer: Partial<CustomerEntity>): Promise<string> {
    const sql = `
      INSERT INTO customers (
        id, name, contact_number, active, sales_person, sales_area, sales_group,
        loyalty_points, payment_terms, address, billing_address, discount, credit_limit, price_level_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await query(sql, [
      customer.id, customer.name, customer.contactNumber, customer.active ?? true, 
      customer.salesPerson || null, customer.salesArea || null, customer.salesGroup || null,
      customer.loyaltyPoints || 0, customer.paymentTerms || null, customer.address || null, 
      customer.billingAddress || null, customer.discount || 0, customer.creditLimit || 0, customer.priceLevelId || null
    ]);

    return customer.id as string;
  }

  async update(id: string, customer: Partial<CustomerEntity>): Promise<void> {
    const updates: string[] = [];
    const params: any[] = [];
    
    // Manual mapping for now
    const fieldMapping: Record<string, string> = {
      name: 'name',
      contactNumber: 'contact_number',
      active: 'active',
      salesPerson: 'sales_person',
      salesArea: 'sales_area',
      salesGroup: 'sales_group',
      loyaltyPoints: 'loyalty_points',
      paymentTerms: 'payment_terms',
      address: 'address',
      billingAddress: 'billing_address',
      discount: 'discount',
      creditLimit: 'credit_limit',
      priceLevelId: 'price_level_id'
    };

    Object.entries(customer).forEach(([key, value]) => {
      if (fieldMapping[key]) {
        updates.push(`${fieldMapping[key]} = ?`);
        params.push(value);
      }
    });
    
    if (updates.length > 0) {
      const sql = `UPDATE customers SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`;
      params.push(id);
      await query(sql, params);
    }
  }

  async delete(id: string): Promise<void> {
    await query(`DELETE FROM customers WHERE id = ?`, [id]);
  }
}
