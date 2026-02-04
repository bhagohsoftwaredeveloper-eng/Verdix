/**
 * centralized API configuration
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

/**
 * Helper to get the full API URL for a specific endpoint
 * @param path - The endpoint path (e.g., '/products')
 * @returns The full URL (e.g., 'http://localhost:3000/api/products')
 */
export const getApiUrl = (path: string) => {
  const baseUrl = API_BASE_URL.replace(/\/$/, ''); // Remove trailing slash if present
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};
