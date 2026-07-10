import { CustomerRepository } from '../domain/ICustomerRepository';
import { CustomerEntity } from '../domain/Customer';

export type CreateCustomerRequest = Partial<CustomerEntity>;

export class CreateCustomerUseCase {
  constructor(private customerRepository: CustomerRepository) {}

  async execute(request: CreateCustomerRequest): Promise<string> {
    if (!request.id || !request.name) {
      throw new Error('Customer ID and name are required');
    }

    const customerId = await this.customerRepository.create(request);
    return customerId;
  }
}
