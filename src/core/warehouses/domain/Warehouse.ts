export interface WarehouseEntity {
  id: string;
  name: string;
  location?: string;
  contactNumber?: string;
  active: boolean;
  isMain?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
