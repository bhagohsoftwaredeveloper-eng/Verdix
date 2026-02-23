/**
 * Centralized API configuration
 */
/**
 * Centralized API configuration
 */
export const DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

/**
 * Normalizes and formats an API base URL and path
 * @param base - The base IP or URL (e.g., '192.168.1.100' or 'http://localhost:3001')
 * @param path - The endpoint path (e.g., '/products')
 * @returns The full formatted URL
 */
export const formatApiUrl = (base: string, path: string) => {
  let formatted = base.trim();
  
  if (!formatted) return path.startsWith('/') ? `/api${path}` : `/api/${path}`;

  // Add protocol if missing
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = `http://${formatted}`;
  }
  
  // Add port 3001 if no port/protocol-relative port is specified and it's not a domain/localhost with port
  // We check if it contains a colon (after the protocol) to see if a port is already there
  const urlParts = formatted.split('://');
  if (urlParts.length > 1 && !urlParts[1].includes(':') && !formatted.includes('.com') && !formatted.includes('localhost')) {
      formatted = `${formatted}:3001`;
  }
  
  // Ensure it ends with /api
  if (!formatted.endsWith('/api') && !formatted.includes('/api/')) {
    formatted = `${formatted.replace(/\/$/, '')}/api`;
  }
  
  const cleanBase = formatted.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};

/**
 * Helper to get the full API URL for a specific endpoint
 * @param path - The endpoint path (e.g., '/products')
 * @returns The full URL or relative path
 */
export const getApiUrl = (path: string) => {
  // In browser context, handle custom server IP and fallback to relative paths
  if (typeof window !== 'undefined') {
    const customIp = localStorage.getItem('server_ip');
    
    if (customIp) {
      return formatApiUrl(customIp, path);
    }
    
    // FALLBACK: Use relative path in the browser if no custom IP is set.
    // This ensures compatibility with whatever port the dev server is running on (e.g. 3000 vs 3001).
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `/api${cleanPath}`;
  }

  // Server-side context (SSR/Server Actions)
  const cleanBase = DEFAULT_API_BASE_URL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};
