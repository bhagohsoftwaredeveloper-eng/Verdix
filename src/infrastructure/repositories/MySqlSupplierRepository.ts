import { query } from '../../../lib/mysql';
import { SupplierRepository } from '../../core/suppliers/domain/ISupplierRepository';
import { SupplierEntity } from '../../core/suppliers/domain/Supplier';

export class MySqlSupplierRepository implements SupplierRepository {
  async findAll(): Promise<SupplierEntity[]> {
    const sql = 'SELECT id, name, contact_person as contactPerson, contact_number as contactNumber, email, address, active, payment_terms as paymentTerms, category, created_at as createdAt, updated_at as updatedAt FROM suppliers ORDER BY name ASC';
    const suppliers: any[] = await query(sql);
    return suppliers.map(s => ({
      ...s,
      active: !!s.active
    }));
  }

  async findById(id: string): Promise<SupplierEntity | null> {
    const sql = 'SELECT id, name, contact_person as contactPerson, contact_number as contactNumber, email, address, active, payment_terms as paymentTerms, category, created_at as createdAt, updated_at as updatedAt FROM suppliers WHERE id = ?';
    const results: any[] = await query(sql, [id]);
    if (results.length === 0) return null;
    const s = results[0];
    return {
      ...s,
      active: !!s.active
    };
  }

  async create(supplier: Partial<SupplierEntity>): Promise<string> {
    const sql = `
      INSERT INTO suppliers (id, name, contact_person, contact_number, email, address, active, payment_terms, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await query(sql, [
      supplier.id, supplier.name, supplier.contactPerson || null, supplier.contactNumber || null,
      supplier.email || null, supplier.address || null, supplier.active ?? true,
      supplier.paymentTerms || null, supplier.category || null
    ]);
    return supplier.id as string;
  }

  async update(id: string, supplier: Partial<SupplierEntity>): Promise<void> {
    const updates: string[] = [];
    const params: any[] = [];
    
    const fieldMapping: Record<string, string> = {
      name: 'name',
      contactPerson: 'contact_person',
      contactNumber: 'contact_number',
      email: 'email',
      address: 'address',
      active: 'active',
      paymentTerms: 'payment_terms',
      category: 'category'
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
