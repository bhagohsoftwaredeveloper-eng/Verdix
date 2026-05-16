
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
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
  
  // Return config but mask password
  return NextResponse.json({
    host: config.DB_HOST || 'localhost',
    port: config.DB_PORT || '5432',
    user: config.DB_USER || 'postgres',
    database: config.DB_NAME || 'stock_pilot',
    // Don't send the actual password for security
    hasPassword: !!config.DB_PASSWORD
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { host, port, user, password, database, action } = body;

    if (action === 'test') {
      // Test PostgreSQL connection
      const client = new Client({
        host,
        port: parseInt(port),
        user,
        password,
        database
      });
      
      try {
        await client.connect();
        await client.end();
        return NextResponse.json({ success: true, message: 'Connection successful!' });
      } catch (error: any) {
        return NextResponse.json({ success: false, message: `Connection failed: ${error.message}` }, { status: 400 });
      }
    } else if (action === 'save') {
      // Save to .env
      // Also update DATABASE_URL for Prisma
      const dbUrl = `postgresql://${user}:${password}@${host}:${port}/${database}`;
      
      writeEnvFile({
        DB_HOST: host,
        DB_PORT: port.toString(),
        DB_USER: user,
        DB_PASSWORD: password,
        DB_NAME: database,
        DATABASE_URL: dbUrl
      });
      
      return NextResponse.json({ success: true, message: 'Configuration saved. Please restart the application for changes to take effect.' });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Error in database settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
