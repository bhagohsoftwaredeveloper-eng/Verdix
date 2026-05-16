// Test script for warehouses API
const BASE_URL = 'http://localhost:9003';

async function testWarehousesAPI() {
  console.log('Testing Warehouses API...\n');

  try {
    // Test GET /api/warehouses
    console.log('1. Testing GET /api/warehouses');
    const getResponse = await fetch(`${BASE_URL}/api/warehouses?activeOnly=true`);
    const getData = await getResponse.json();
    console.log('GET Response:', getData);

    // Skip POST test, use existing warehouse
    const warehouseId = 'wh_distribution'; // Use existing warehouse

    // Test GET /api/warehouses/[id]
    console.log('\n3. Testing GET /api/warehouses/[id]');
    const getByIdResponse = await fetch(`${BASE_URL}/api/warehouses/${warehouseId}`);
    const getByIdData = await getByIdResponse.json();
    console.log('GET by ID Response:', getByIdData);

    // Test PUT /api/warehouses/[id]
    console.log('\n4. Testing PUT /api/warehouses/[id]');
    const putData = {
      name: 'Updated Test Warehouse',
      location: 'Updated Location'
    };
    const putResponse = await fetch(`${BASE_URL}/api/warehouses/${warehouseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(putData)
    });
    const putResult = await putResponse.json();
    console.log('PUT Response:', putResult);

    // Test DELETE /api/warehouses/[id]
    console.log('\n5. Testing DELETE /api/warehouses/[id]');
    const deleteResponse = await fetch(`${BASE_URL}/api/warehouses/${warehouseId}`, {
      method: 'DELETE',
    });
    const deleteResult = await deleteResponse.json();
    console.log('DELETE Response:', deleteResult);

  } catch (error) {
    console.error('Error testing warehouses API:', error);
  }
}

// Run the test
testWarehousesAPI();
