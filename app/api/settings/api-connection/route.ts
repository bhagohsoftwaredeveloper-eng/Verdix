
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Helper to read .env file
function readEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  try {
      if (!fs.existsSync(envPath)) {
        return {};
      }
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      return envConfig;
  } catch (e) {
      console.error("Error reading .env file", e);
      return {};
  }
}

// Helper to write to .env file
function writeEnvFile(newConfig: Record<string, string>) {
  const envPath = path.resolve(process.cwd(), '.env');
  let currentConfig = {};
  try {
      currentConfig = readEnvFile();
  } catch (e) {
      // ignore
  }
  
  const mergedConfig = { ...currentConfig, ...newConfig };
  
  const envContent = Object.entries(mergedConfig)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
    
  fs.writeFileSync(envPath, envContent);
}

export async function GET() {
  const config = readEnvFile();
  
  return NextResponse.json({
    url: config.API_URL || '',
    key: config.API_KEY || '',
    secret: config.API_SECRET || '',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, key, secret } = body;

    // Save to .env
    writeEnvFile({
      API_URL: url,
      API_KEY: key,
      API_SECRET: secret
    });
    
    return NextResponse.json({ success: true, message: 'API Configuration saved.' });

  } catch (error: any) {
    console.error('Error in API connection settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
