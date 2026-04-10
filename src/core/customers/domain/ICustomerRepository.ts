import { CustomerEntity } from './Customer';

export interface GetCustomersFilters {
  search?: string | null;
}

export interface CustomerRepository {
  findAll(limit: number, offset: number, filters: GetCustomersFilters): Promise<CustomerEntity[]>;
  countAll(filters: GetCustomersFilters): Promise<number>;
  findById(id: string): Promise<CustomerEntity | null>;
  create(customer: Partial<CustomerEntity>): Promise<string>;
  update(id: string, customer: Partial<CustomerEntity>): Promise<void>;
  delete(id: string): Promise<void>;
}
