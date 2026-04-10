import { CustomerRepository, GetCustomersFilters } from '../domain/ICustomerRepository';
import { CustomerEntity } from '../domain/Customer';

export interface GetCustomersRequest {
  limit: number;
  offset: number;
  filters: GetCustomersFilters;
}

export interface GetCustomersResponse {
  customers: CustomerEntity[];
  total: number;
}

export class GetCustomersUseCase {
  constructor(private customerRepository: CustomerRepository) {}

  async execute(request: GetCustomersRequest): Promise<GetCustomersResponse> {
    const [customers, total] = await Promise.all([
      this.customerRepository.findAll(request.limit, request.offset, request.filters),
      this.customerRepository.countAll(request.filters)
    ]);

    return { customers, total };
  }
}
