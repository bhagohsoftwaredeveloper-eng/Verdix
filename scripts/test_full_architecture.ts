import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

async function testCustomers() {
  console.log('--- Testing Customers API ---');
  try {
    const listResponse = await axios.get(`${BASE_URL}/customers?limit=5`);
    console.log('GET /customers success:', listResponse.data.success);
    console.log('Count:', listResponse.data.pagination.total);

    const newCustomer = {
      customerId: `TEST_${Date.now()}`,
      name: 'Test Clean Architect',
      contactNumber: '09123456789',
      active: true
    };

    const createResponse = await axios.post(`${BASE_URL}/customers`, newCustomer);
    console.log('POST /customers success:', createResponse.data.success);
    console.log('Created ID:', createResponse.data.data.id);
  } catch (error: any) {
    console.error('Customers test failed:', error.response?.data || error.message);
  }
}

async function testSales() {
  console.log('\n--- Testing Sales API ---');
  try {
    const listResponse = await axios.get(`${BASE_URL}/sales`);
    console.log('GET /sales success:', listResponse.data.success);
    console.log('Count:', listResponse.data.data.length);

    // Note: Creating a sale is complex and requires valid product/customer IDs from the DB.
    // This script assumes there's at least one product and customer.
    // In a real test, we would fetch them first.
  } catch (error: any) {
    console.error('Sales test failed:', error.response?.data || error.message);
  }
}

async function runTests() {
  await testCustomers();
  await testSales();
}

runTests();
