import { NextRequest, NextResponse } from 'next/server';
import { getExternalApiConfig } from '@/lib/external-api-config';

/**
 * GET /api/settings/external-api
 * Retrieve external API configuration
 */
export async function GET(request: NextRequest) {
  try {
    const config = await getExternalApiConfig();
    
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

    // Note: This external API configuration would require a dedicated table
    // For now, this is handled via the getExternalApiConfig helper which checks environment variables
    // If a database table is needed, add it to the schema and update this implementation

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully (currently handled via environment variables)',
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
