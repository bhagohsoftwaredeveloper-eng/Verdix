import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001/api/reports';

async function testEndpoint(name: string, path: string) {
  try {
    const url = `${BASE_URL}${path}`;
    console.log(`Testing ${name}: ${url}`);
    const res = await fetch(url);
    const data: any = await res.json();
    
    if (res.status === 200 && data.success) {
      console.log(`✅ ${name} Success! Items: ${Array.isArray(data.data) ? data.data.length : 'N/A'}`);
      if (data.summary) {
          console.log(`   Summary: Items=${data.summary.totalItems}, Value=${data.summary.totalValue}`);
      }
    } else {
      console.error(`❌ ${name} Failed! Status: ${res.status}`, data);
    }
  } catch (error: any) {
    console.error(`❌ ${name} Error:`, error.message);
  }
}

async function runTests() {
  console.log('--- Starting Reports API Verification ---');
  
  await testEndpoint('Inventory Report', '/inventory');
  await testEndpoint('Low Stock Report', '/inventory?lowStock=true');
  await testEndpoint('Stock Movements', '/movements?limit=5');
  await testEndpoint('Sales Velocity (Fast)', '/velocity?type=fast&limit=5');
  await testEndpoint('Sales Velocity (Slow)', '/velocity?type=slow&limit=5');
  await testEndpoint('Adjustments', '/adjustments');
  
  console.log('--- Verification Complete ---');
}

runTests();
