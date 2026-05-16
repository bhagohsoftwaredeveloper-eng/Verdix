
async function verifyQuickReceive() {
  const baseUrl = 'http://localhost:3000/api/purchase-orders';
  const productsUrl = 'http://localhost:3000/api/products?limit=1';
  const suppliersUrl = 'http://localhost:3000/api/suppliers';

  try {
    // 1. Fetch Product
    const prodRes = await fetch(productsUrl);
    const prodJson = await prodRes.json();
    const product = prodJson.data[0];
    const initialStock = product.stock;
    console.log('Initial Stock:', initialStock);

    // 2. Fetch Supplier
    const suppRes = await fetch(suppliersUrl);
    const suppJson = await suppRes.json();
    const supplier = suppJson.data[0];

    // 3. Quick Receive PO
    const payload = {
        supplierId: supplier.id,
        supplierName: supplier.name,
        date: new Date().toISOString(),
        items: [
          {
            productId: product.id,
            productName: product.name,
            quantity: 10,
            cost: 100,
            sellingPrice: 150
          }
        ],
        total: 1000,
        paymentMethod: 'Cash',
        purchaseType: 'Receive'
    };

    console.log('Testing Quick Receive...');
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('Result:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('Checking stock update...');
      const checkProdRes = await fetch(`${productsUrl}&search=${product.name}`);
      const checkProdJson = await checkProdRes.json();
      const updatedProduct = checkProdJson.data.find(p => p.id === product.id);
      
      console.log('New Stock:', updatedProduct.stock);
      if (Number(updatedProduct.stock) === Number(initialStock) + 10) {
        console.log('SUCCESS: Stock updated correctly.');
      } else {
        console.error('FAILURE: Stock not updated correctly.');
      }
    } else {
      console.error('FAILURE: ' + result.error);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

verifyQuickReceive();
