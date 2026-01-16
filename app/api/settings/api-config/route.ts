
import { NextResponse } from 'next/server';
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

export async function GET() {
  const config = readEnvFile();
  
  // Return only values needed for internal usage/testing if necessary
  // This endpoint might be called by the frontend or other parts of the system if needed,
  // but for server actions we can also just use the helper directly if we shared it.
  // However, the plan specified a route.
  return NextResponse.json({
    url: config.API_URL || '',
    key: config.API_KEY || '',
    secret: config.API_SECRET || '',
  });
}
