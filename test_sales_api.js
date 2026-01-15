const { default: fetch } = require('node-fetch');

async function testSalesAPI() {
  const testData = {
    customer: {
      id: '1',
      name: 'Juan Dela Cruz',
      contactNumber: '09123456789'
    },
    invoiceDate: '2025-12-17',
    dueDate: '2025-12-24',
    reference: 'INV-123456',
    paymentMethod: 'Cash',
    status: 'Pending',
    shipping: 50,
    items: [
      {
        product: {
          id: '1',
          name: 'Coca-Cola 1.5L',
          sku: 'CC150',
          barcode: '4800016945486',
          price: 75.00
        },
        quantity: 2,
        price: 75.00
      }
    ]
  };

  try {
    console.log('Testing sales API with data:', JSON.stringify(testData, null, 2));

    const response = await fetch('http://localhost:9003/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testSalesAPI();
