import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

/**
 * GET /api/settings/external-api
 * Retrieve external API configuration
 */
export async function GET(request: NextRequest) {
  try {
    const settingsQuery = `
      SELECT setting_key, setting_value 
      FROM external_api_settings
    `;
    
    const settings = await query(settingsQuery, []);
    
    // Convert array of settings to object
    const config: Record<string, any> = {};
    settings.forEach((setting: any) => {
      let value = setting.setting_value;
      
      // Parse boolean and numeric values
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else if (!isNaN(value) && value !== '') value = Number(value);
      
      config[setting.setting_key] = value;
    });

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('Error fetching external API settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/external-api
 * Update external API configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      enabled,
      apiEndpoint,
      authType,
      apiKey,
      bearerToken,
      timeout,
      retryAttempts,
      retryDelay,
      syncMode,
      onErrorAction,
    } = body;

    // Update each setting
    const updateQuery = `
      INSERT INTO external_api_settings (setting_key, setting_value)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `;

    const updates = [
      ['enabled', String(enabled ?? false)],
      ['api_endpoint', apiEndpoint ?? ''],
      ['auth_type', authType ?? 'api_key'],
      ['api_key', apiKey ?? ''],
      ['bearer_token', bearerToken ?? ''],
      ['timeout', String(timeout ?? 30000)],
      ['retry_attempts', String(retryAttempts ?? 3)],
      ['retry_delay', String(retryDelay ?? 2000)],
      ['sync_mode', syncMode ?? 'realtime'],
      ['on_error_action', onErrorAction ?? 'log_only'],
    ];

    for (const [key, value] of updates) {
      await query(updateQuery, [key, value]);
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating external API settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/external-api (Test Connection)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiEndpoint, authType, apiKey, bearerToken, timeout } = body;

    if (!apiEndpoint) {
      return NextResponse.json(
        { success: false, error: 'API endpoint is required' },
        { status: 400 }
      );
    }

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authType === 'api_key' && apiKey) {
      headers['X-API-Key'] = apiKey;
    } else if (authType === 'bearer_token' && bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`;
    }

    // Send test request
    const testPayload = {
      test: true,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(`${apiEndpoint}/test`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(timeout || 30000),
    });

    const responseData = await response.json().catch(() => ({}));

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'Connection successful',
        response: responseData,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: `Connection failed: ${response.status} ${response.statusText}`,
        response: responseData,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: `Connection test failed: ${errorMessage}`,
    });
  }
}
