
import fetch from 'node-fetch';

async function testApi() {
  try {
    const response = await fetch('http://localhost:9003/api/sales/by-product');
    const data: any = await response.json();
    console.log('API_RESPONSE:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error fetching API:', error);
  }
}

testApi();
