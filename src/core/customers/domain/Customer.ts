export interface CustomerEntity {
  id: string;
  name: string;
  contactNumber: string;
  active: boolean;
  salesPerson?: string;
  salesArea?: string;
  salesGroup?: string;
  loyaltyPoints: number;
  currentPoints?: number;
  expiryDate?: string;
  paymentTerms?: string;
  address?: string;
  billingAddress?: string;
  discount: number;
  creditLimit: number;
  priceLevelId?: string;
  balance?: number;
  isExpired?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
