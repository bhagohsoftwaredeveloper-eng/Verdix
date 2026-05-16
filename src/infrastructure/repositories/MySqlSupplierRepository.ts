import { query } from '../../../lib/mysql';
import { SupplierRepository } from '../../core/suppliers/domain/ISupplierRepository';
import { SupplierEntity } from '../../core/suppliers/domain/Supplier';

export class MySqlSupplierRepository implements SupplierRepository {
  async findAll(): Promise<SupplierEntity[]> {
    const sql = 'SELECT id, name, contact_number as contactNumber, email, address, payment_terms as paymentTerms, created_at as createdAt, updated_at as updatedAt FROM suppliers ORDER BY name ASC';
    const suppliers: any[] = await query(sql);
    return suppliers.map(s => ({
      ...s,
      active: true,
      contactPerson: null,
      category: null
    }));
  }

  async findById(id: string): Promise<SupplierEntity | null> {
    const sql = 'SELECT id, name, contact_number as contactNumber, email, address, payment_terms as paymentTerms, created_at as createdAt, updated_at as updatedAt FROM suppliers WHERE id = ?';
    const results: any[] = await query(sql, [id]);
    if (results.length === 0) return null;
    const s = results[0];
    return {
      ...s,
      active: true,
      contactPerson: null,
      category: null
    };
  }

  async create(supplier: Partial<SupplierEntity>): Promise<string> {
    const sql = `
      INSERT INTO suppliers (id, name, contact_number, email, address, payment_terms)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await query(sql, [
      supplier.id, supplier.name, supplier.contactNumber || null,
      supplier.email || null, supplier.address || null, supplier.paymentTerms || null
    ]);
    return supplier.id as string;
  }

  async update(id: string, supplier: Partial<SupplierEntity>): Promise<void> {
    const updates: string[] = [];
    const params: any[] = [];
    
    const fieldMapping: Record<string, string> = {
      name: 'name',
      contactNumber: 'contact_number',
      email: 'email',
      address: 'address',
      paymentTerms: 'payment_terms'
    };

    Object.entries(supplier).forEach(([key, value]) => {
      if (fieldMapping[key]) {
        updates.push(`${fieldMapping[key]} = ?`);
        params.push(value);
      }
    });

    if (updates.length > 0) {
      const sql = `UPDATE suppliers SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`;
      params.push(id);
      await query(sql, params);
    }
  }

  async delete(id: string): Promise<void> {
    await query('DELETE FROM suppliers WHERE id = ?', [id]);
  }
}
