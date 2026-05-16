import { db } from '@/lib/db';
import { SupplierRepository } from '../../core/suppliers/domain/ISupplierRepository';
import { SupplierEntity } from '../../core/suppliers/domain/Supplier';

export class MySqlSupplierRepository implements SupplierRepository {
  async findAll(): Promise<SupplierEntity[]> {
    const suppliers = await db.supplier.findMany({
      orderBy: { name: 'asc' }
    });
    
    return suppliers.map(s => ({
      id: s.id,
      name: s.name,
      contactNumber: s.contactNumber || '',
      email: s.email || undefined,
      address: s.address || undefined,
      paymentTerms: s.paymentTerms || undefined,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      active: true,
      contactPerson: undefined,
      category: undefined
    }));
  }

  async findById(id: string): Promise<SupplierEntity | null> {
    const s = await db.supplier.findUnique({
      where: { id }
    });

    if (!s) return null;

    return {
      id: s.id,
      name: s.name,
      contactNumber: s.contactNumber || '',
      email: s.email || undefined,
      address: s.address || undefined,
      paymentTerms: s.paymentTerms || undefined,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      active: true,
      contactPerson: undefined,
      category: undefined
    };
  }

  async create(supplier: Partial<SupplierEntity>): Promise<string> {
    const created = await db.supplier.create({
      data: {
        id: supplier.id,
        name: supplier.name!,
        contactNumber: supplier.contactNumber,
        email: supplier.email,
        address: supplier.address,
        paymentTerms: supplier.paymentTerms,
      }
    });
    return created.id;
  }

  async update(id: string, supplier: Partial<SupplierEntity>): Promise<void> {
    const data: any = {};
    if (supplier.name !== undefined) data.name = supplier.name;
    if (supplier.contactNumber !== undefined) data.contactNumber = supplier.contactNumber;
    if (supplier.email !== undefined) data.email = supplier.email;
    if (supplier.address !== undefined) data.address = supplier.address;
    if (supplier.paymentTerms !== undefined) data.paymentTerms = supplier.paymentTerms;

    await db.supplier.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<void> {
    await db.supplier.delete({ where: { id } });
  }
}
