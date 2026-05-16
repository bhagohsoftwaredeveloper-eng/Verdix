import { db } from '@/lib/db';
import { CustomerRepository, GetCustomersFilters } from '../../core/customers/domain/ICustomerRepository';
import { CustomerEntity } from '../../core/customers/domain/Customer';
import { isLoyaltyCardExpired } from '../../../lib/loyalty-utils';

export class MySqlCustomerRepository implements CustomerRepository {
  async findAll(limit: number, offset: number, filters: GetCustomersFilters): Promise<CustomerEntity[]> {
    const where = filters.search ? {
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' as const } },
        { contactNumber: { contains: filters.search, mode: 'insensitive' as const } },
      ],
    } : {};

    const customers = await db.customer.findMany({
      where,
      include: {
        loyalty: true,
        salesInvoices: {
          where: {
            status: { not: 'Paid' }
          },
          select: {
            total: true,
            amountPaid: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset,
    });

    return customers.map(c => {
      const balance = c.salesInvoices.reduce((acc, inv) => {
        return acc + (Number(inv.total) - (Number(inv.amountPaid) || 0));
      }, 0);

      return {
        id: c.id,
        name: c.name,
        contactNumber: c.contactNumber || '',
        active: c.active,
        salesPerson: c.salesPerson || undefined,
        salesArea: c.salesArea || undefined,
        salesGroup: c.salesGroup || undefined,
        loyaltyPoints: c.loyalty ? Number(c.loyalty.currentPoints) : Number(c.loyaltyPoints),
        currentPoints: c.loyalty ? Number(c.loyalty.currentPoints) : undefined,
        expiryDate: c.loyalty?.expiryDate?.toISOString() || undefined,
        paymentTerms: c.paymentTerms || undefined,
        address: c.address || undefined,
        billingAddress: c.billingAddress || undefined,
        discount: Number(c.discount),
        creditLimit: Number(c.creditLimit),
        priceLevelId: c.priceLevelId || undefined,
        balance,
        isExpired: isLoyaltyCardExpired(c.loyalty?.expiryDate?.toISOString() || undefined),
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    });
  }

  async countAll(filters: GetCustomersFilters): Promise<number> {
    const where = filters.search ? {
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' as const } },
        { contactNumber: { contains: filters.search, mode: 'insensitive' as const } },
      ],
    } : {};

    return await db.customer.count({ where });
  }

  async findById(id: string): Promise<CustomerEntity | null> {
    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        loyalty: true,
        salesInvoices: {
          where: {
            status: { not: 'Paid' }
          },
          select: {
            total: true,
            amountPaid: true
          }
        }
      }
    });

    if (!customer) return null;

    const balance = customer.salesInvoices.reduce((acc, inv) => {
      return acc + (Number(inv.total) - (Number(inv.amountPaid) || 0));
    }, 0);

    return {
      id: customer.id,
      name: customer.name,
      contactNumber: customer.contactNumber || '',
      active: customer.active,
      salesPerson: customer.salesPerson || undefined,
      salesArea: customer.salesArea || undefined,
      salesGroup: customer.salesGroup || undefined,
      loyaltyPoints: customer.loyalty ? Number(customer.loyalty.currentPoints) : Number(customer.loyaltyPoints),
      currentPoints: customer.loyalty ? Number(customer.loyalty.currentPoints) : undefined,
      expiryDate: customer.loyalty?.expiryDate?.toISOString() || undefined,
      paymentTerms: customer.paymentTerms || undefined,
      address: customer.address || undefined,
      billingAddress: customer.billingAddress || undefined,
      discount: Number(customer.discount),
      creditLimit: Number(customer.creditLimit),
      priceLevelId: customer.priceLevelId || undefined,
      balance,
      isExpired: isLoyaltyCardExpired(customer.loyalty?.expiryDate?.toISOString() || undefined),
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    };
  }

  async create(customer: Partial<CustomerEntity>): Promise<string> {
    const data: any = {
      name: customer.name!,
      contactNumber: customer.contactNumber,
      active: customer.active ?? true,
      salesPerson: customer.salesPerson,
      salesArea: customer.salesArea,
      salesGroup: customer.salesGroup,
      loyaltyPoints: customer.loyaltyPoints || 0,
      paymentTerms: customer.paymentTerms,
      address: customer.address,
      billingAddress: customer.billingAddress,
      discount: customer.discount || 0,
      creditLimit: customer.creditLimit || 0,
      priceLevelId: customer.priceLevelId,
    };

    if (customer.id) {
      data.id = customer.id;
    }

    const created = await db.customer.create({ data });
    return created.id;
  }

  async update(id: string, customer: Partial<CustomerEntity>): Promise<void> {
    const data: any = {};
    if (customer.name !== undefined) data.name = customer.name;
    if (customer.contactNumber !== undefined) data.contactNumber = customer.contactNumber;
    if (customer.active !== undefined) data.active = customer.active;
    if (customer.salesPerson !== undefined) data.salesPerson = customer.salesPerson;
    if (customer.salesArea !== undefined) data.salesArea = customer.salesArea;
    if (customer.salesGroup !== undefined) data.salesGroup = customer.salesGroup;
    if (customer.loyaltyPoints !== undefined) data.loyaltyPoints = customer.loyaltyPoints;
    if (customer.paymentTerms !== undefined) data.paymentTerms = customer.paymentTerms;
    if (customer.address !== undefined) data.address = customer.address;
    if (customer.billingAddress !== undefined) data.billingAddress = customer.billingAddress;
    if (customer.discount !== undefined) data.discount = customer.discount;
    if (customer.creditLimit !== undefined) data.creditLimit = customer.creditLimit;
    if (customer.priceLevelId !== undefined) data.priceLevelId = customer.priceLevelId;

    await db.customer.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<void> {
    await db.customer.delete({ where: { id } });
  }
}
