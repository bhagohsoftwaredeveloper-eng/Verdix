import { useState, useEffect } from 'react';
import { Product, Sale, Customer, PaymentMethod, PurchaseOrder, Supplier } from '@/lib/types';
import { getApiUrl } from '@/lib/api-config';

export interface UseProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface UseSalesInvoicesResult {
  salesInvoices: Sale[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProducts(search?: string, availability?: string, supplierId?: string, warehouseId?: string): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search) {
        params.append('search', search);
      }
      if (availability) {
        params.append('availability', availability);
      }
      if (supplierId) {
        params.append('supplierId', supplierId);
      }
      if (warehouseId) {
        params.append('warehouseId', warehouseId);
      }
      params.append('limit', '100'); // Get more products for search

      const response = await fetch(getApiUrl(`/products?${params.toString()}`));
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch products');
      }

      // Transform the data to match the Product interface
      const transformedProducts: Product[] = result.data.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        additionalDescription: '',
        category: item.category || '',
        brand: item.brand || '',
        subcategory: '',
        supplier: '',
        stock: item.stock || 0,
        reorderPoint: item.reorderPoint || 0,
        avgDailySales: item.avgDailySales || 0,
        price: parseFloat(item.price) || 0,
        cost: item.cost ? parseFloat(item.cost) : undefined,
        sku: item.sku || '',
        barcode: item.barcode || '',
        imageUrl: '',
        imageHint: '',
        vatStatus: item.vat_status,
        availability: item.availability,
        unitOfMeasure: item.unitOfMeasure || item.unit_of_measure || '',
        incomeAccount: '',
        expenseAccount: '',
        priceLevels: item.priceLevels || [],
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));

      setProducts(transformedProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, availability, supplierId, warehouseId]);

  const refetch = () => {
    fetchProducts();
  };

  return { products, loading, error, refetch };
}

export interface UseCustomersResult {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSalesInvoices(): UseSalesInvoicesResult {
  const [salesInvoices, setSalesInvoices] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSalesInvoices = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(getApiUrl('/sales'));
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch sales invoices');
      }

      // The API already returns data in the correct format
      setSalesInvoices(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching sales invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesInvoices();
  }, []);

  const refetch = () => {
    fetchSalesInvoices();
  };

  return { salesInvoices, loading, error, refetch };
}

export function useCustomers(search?: string): UseCustomersResult {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search) {
        params.append('search', search);
      }
      params.append('limit', '100'); // Get more customers for search

      const response = await fetch(getApiUrl(`/customers?${params.toString()}`));
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch customers');
      }

      // Transform the data to match the Customer interface
      const transformedCustomers: Customer[] = result.data.map((item: any) => ({
        id: item.id,
        name: item.name,
        contactNumber: item.contactNumber || '',
        active: item.active ?? true,
        salesPerson: item.salesPerson || '',
        salesArea: item.salesArea || '',
        salesGroup: item.salesGroup || '',
        loyaltyPoints: item.loyaltyPoints || 0,
        paymentTerms: item.paymentTerms || '',
        address: item.address || '',
        billingAddress: item.billingAddress || '',
        discount: item.discount || 0,
        creditLimit: item.creditLimit || 0,
        priceLevelId: item.priceLevelId || '',
      }));

      setCustomers(transformedCustomers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const refetch = () => {
    fetchCustomers();
  };

  return { customers, loading, error, refetch };
}

export interface UsePaymentMethodsResult {
  paymentMethods: PaymentMethod[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePaymentMethods(search?: string): UsePaymentMethodsResult {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search) {
        params.append('search', search);
      }
      params.append('activeOnly', 'true'); // Only fetch active payment methods
      params.append('limit', '100');

      const response = await fetch(getApiUrl(`/payment-methods?${params.toString()}`));
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch payment methods');
      }

      // Transform the data to match the PaymentMethod interface
      const transformedPaymentMethods: PaymentMethod[] = result.data.map((item: any) => ({
        id: item.id,
        name: item.name,
        isReferenceRequired: item.isReferenceRequired ?? false,
      }));

      setPaymentMethods(transformedPaymentMethods);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching payment methods:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, [search]);

  const refetch = () => {
    fetchPaymentMethods();
  };

  return { paymentMethods, loading, error, refetch };
}

export interface UsePurchaseOrdersResult {
  purchaseOrders: PurchaseOrder[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export function usePurchaseOrders(search?: string, status?: string, page: number = 1, limit: number = 10): UsePurchaseOrdersResult {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, offset: 0, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const offset = (page - 1) * limit;
      const params = new URLSearchParams();
      if (search) {
        params.append('search', search);
      }
      if (status) {
        params.append('status', status);
      }
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(getApiUrl(`/purchase-orders?${params.toString()}`), {
        cache: 'no-store'
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch purchase orders');
      }

      setPurchaseOrders(result.data || []);
      if (result.pagination) {
        setPagination(result.pagination);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching purchase orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, [search, status, page, limit]);

  const refetch = () => {
    fetchPurchaseOrders();
  };

  return { purchaseOrders, loading, error, refetch, pagination };
}
// ... existing code ...

export interface BusinessProfile {
  businessName: string;
  address: string;
  contactNumber: string;
  email: string;
  tin: string;
  logoPath: string;
}

export interface UseBusinessProfileResult {
  profile: BusinessProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useBusinessProfile(): UseBusinessProfileResult {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(getApiUrl('/pos-settings'));
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch business profile');
      }

      setProfile(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching business profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const refetch = () => {
    fetchProfile();
  };

  return { profile, loading, error, refetch };
}

export interface UseBadOrdersResult {
  badOrders: any[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export function useBadOrders(search?: string, status?: string, page: number = 1, limit: number = 10): UseBadOrdersResult {
  const [badOrders, setBadOrders] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, offset: 0, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBadOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const offset = (page - 1) * limit;
      const params = new URLSearchParams();
      if (search) {
        params.append('search', search);
      }
      if (status) {
        params.append('status', status);
      }
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(getApiUrl(`/bad-orders?${params.toString()}`), {
        cache: 'no-store'
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch bad orders');
      }

      setBadOrders(result.data || []);
      if (result.pagination) {
        setPagination(result.pagination);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching bad orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBadOrders();
  }, [search, status, page, limit]);

  const refetch = () => {
    fetchBadOrders();
  };

  return { badOrders, loading, error, refetch, pagination };
}

export interface BadOrderStatsData {
  totalOpenCases: number;
  totalValueAtRisk: number;
  actionRequired: number;
  topSuppliers: {
    supplierId: string;
    supplierName: string;
    openCount: number;
    totalValue: number;
  }[];
}

export function useBadOrderStats() {
  const [stats, setStats] = useState<BadOrderStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/bad-orders/stats'));
      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Listen for updates
    const handleUpdate = () => fetchStats();
    window.addEventListener('bad-orders-updated', handleUpdate);
    // Listen for stock updates too as they might trigger bad order creation
    window.addEventListener('stock-updated', handleUpdate);
    
    return () => {
      window.removeEventListener('bad-orders-updated', handleUpdate);
      window.removeEventListener('stock-updated', handleUpdate);
    };
  }, []);

  return { stats, loading, refetch: fetchStats };
}

export interface UseSuppliersResult {
  suppliers: Supplier[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export function useSuppliers(search?: string, page: number = 1, limit: number = 100): UseSuppliersResult {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pagination, setPagination] = useState({ total: 0, limit: 100, offset: 0, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);

      const offset = (page - 1) * limit;
      const params = new URLSearchParams();
      if (search) {
        params.append('search', search);
      }
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(getApiUrl(`/suppliers?${params.toString()}`), {
        cache: 'no-store'
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch suppliers');
      }

      setSuppliers(result.data || []);
      if (result.pagination) {
        setPagination(result.pagination);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search, page, limit]);

  const refetch = () => {
    fetchSuppliers();
  };

  return { suppliers, loading, error, refetch, pagination };
}
