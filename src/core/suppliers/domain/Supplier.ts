export interface SupplierEntity {
  id: string;
  name: string;
  contactPerson?: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  active: boolean;
  paymentTerms?: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}
