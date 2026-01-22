import { useState, useEffect } from 'react';
import { Product, Sale, Customer, PaymentMethod, PurchaseOrder } from '@/lib/types';

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

export function useProducts(search?: string): UseProductsResult {
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
      params.append('limit', '100'); // Get more products for search

      const response = await fetch(`/api/products?${params.toString()}`);
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
        reorderPoint: 0,
        avgDailySales: 0,
        price: parseFloat(item.price) || 0,
        cost: item.cost ? parseFloat(item.cost) : undefined,
        sku: item.sku || '',
        barcode: item.barcode || '',
        imageUrl: '',
        imageHint: '',
        unitOfMeasure: '',
        incomeAccount: '',
        expenseAccount: '',
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
  }, [search]);

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

      const response = await fetch('/api/sales');
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

      const response = await fetch(`/api/customers?${params.toString()}`);
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

      const response = await fetch(`/api/payment-methods?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch payment methods');
      }

      // Transform the data to match the PaymentMethod interface
      const transformedPaymentMethods: PaymentMethod[] = result.data.map((item: any) => ({
        id: item.id,
        name: item.name,
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
}

export function usePurchaseOrders(search?: string, status?: string): UsePurchaseOrdersResult {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search) {
        params.append('search', search);
      }
      if (status) {
        params.append('status', status);
      }
      params.append('limit', '100'); // Get more orders

      const response = await fetch(`/api/purchase-orders?${params.toString()}`, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch purchase orders');
      }

      setPurchaseOrders(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching purchase orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, [search, status]);

  const refetch = () => {
    fetchPurchaseOrders();
  };

  return { purchaseOrders, loading, error, refetch };
}
