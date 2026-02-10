/**
 * External API Configuration
 * Settings for integrating with external accounting server
 */

export type ExternalApiConfig = {
  enabled: boolean;
  apiEndpoint: string;
  authType: 'api_key' | 'bearer_token' | 'oauth' | 'none';
  apiKey?: string;
  bearerToken?: string;
  timeout: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
  syncMode: 'realtime' | 'batch';
  onErrorAction: 'retry' | 'queue' | 'log_only';
};

export const DEFAULT_EXTERNAL_API_CONFIG: ExternalApiConfig = {
  enabled: false,
  apiEndpoint: '',
  authType: 'api_key',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 2000, // 2 seconds
  syncMode: 'realtime',
  onErrorAction: 'log_only',
};

/**
 * Get external API configuration from environment or database
 */
export async function getExternalApiConfig(): Promise<ExternalApiConfig> {
  try {
    // Try to fetch from API settings endpoint
    const response = await fetch('/api/settings/external-api');
    if (response.ok) {
      const data = await response.json();
      return data.config || DEFAULT_EXTERNAL_API_CONFIG;
    }
  } catch (error) {
    console.error('Failed to fetch external API config:', error);
  }
  
  // Fallback to default config
  return DEFAULT_EXTERNAL_API_CONFIG;
}

/**
 * Validate external API configuration
 */
export function validateExternalApiConfig(config: Partial<ExternalApiConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.enabled) {
    if (!config.apiEndpoint || config.apiEndpoint.trim() === '') {
      errors.push('API endpoint is required when integration is enabled');
    }

    if (config.apiEndpoint && !isValidUrl(config.apiEndpoint)) {
      errors.push('API endpoint must be a valid URL');
    }

    if (config.authType === 'api_key' && !config.apiKey) {
      errors.push('API key is required for API key authentication');
    }

    if (config.authType === 'bearer_token' && !config.bearerToken) {
      errors.push('Bearer token is required for bearer token authentication');
    }

    if (config.timeout && config.timeout < 1000) {
      errors.push('Timeout must be at least 1000ms');
    }

    if (config.retryAttempts && config.retryAttempts < 0) {
      errors.push('Retry attempts cannot be negative');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
