const fetch = require('node-fetch');

async function testSalesInvoiceAPI() {
  console.log('Testing sales invoice API...');

  try {
    // Test data
    const testInvoice = {
      customer: {
        id: 'customer_1',
        name: 'John Doe',
        contactNumber: '1234567890'
      },
      invoiceDate: '2025-12-17',
      dueDate: '2025-12-27',
      paymentMethod: 'Cash',
      status: 'Pending',
      shipping: 50.00,
      note: 'Test invoice',
      items: [
        {
          product: {
            id: 'product_1',
            name: 'Test Product 1',
            price: 100.00
          },
          quantity: 2,
          price: 100.00
        },
        {
          product: {
            id: 'product_2',
            name: 'Test Product 2',
            price: 50.00
          },
          quantity: 1,
          price: 50.00
        }
      ]
    };

    console.log('Creating test invoice...');
    const createResponse = await fetch('http://localhost:9003/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testInvoice),
    });

    const createResult = await createResponse.json();
    console.log('Create response:', createResult);

    if (createResult.success) {
      console.log('✅ Invoice created successfully with ID:', createResult.data.id);

      console.log('Fetching invoices...');
      const getResponse = await fetch('http://localhost:9003/api/sales');
      const getResult = await getResponse.json();

      console.log('Get response:', getResult);

      if (getResult.success && getResult.data.length > 0) {
        console.log('✅ Successfully fetched invoices. Count:', getResult.count);
        const latestInvoice = getResult.data[0];
        console.log('Latest invoice:', {
          id: latestInvoice.id,
          customer: latestInvoice.customer.name,
          total: latestInvoice.total,
          status: latestInvoice.status,
          itemsCount: latestInvoice.items.length
        });
      } else {
        console.log('❌ Failed to fetch invoices');
      }
    } else {
      console.log('❌ Failed to create invoice:', createResult.error);
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testSalesInvoiceAPI();
