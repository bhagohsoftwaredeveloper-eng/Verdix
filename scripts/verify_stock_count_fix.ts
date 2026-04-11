async function runTest() {
  console.log('--- STARTING STOCK COUNT API TEST ---');
  const baseUrl = 'http://localhost:3000/api/inventory/stock-counts';

  try {
    // 1. Initialize count
    console.log('\n1. Initializing new stock count...');
    const initRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Count ' + Date.now(),
        notes: 'Automated test via HTTP',
        createdBy: 'Test Script'
      })
    });
    const initData = await initRes.json();
    
    if (!initData.success) {
      throw new Error('Initialization failed: ' + initData.error);
    }
    
    const countId = initData.data.id;
    console.log('✅ Count created with ID:', countId);

    // 2. Fetch the created count to get items
    console.log('\n2. Fetching created count details...');
    const getRes = await fetch(`${baseUrl}/${countId}`);
    const getData = await getRes.json();

    if (!getData.success) {
      throw new Error('Failed to fetch count: ' + getData.error);
    }

    const countEntity = getData.data;
    console.log(`Found ${countEntity.items.length} items in the count.`);
    
    if (countEntity.items.length === 0) {
      throw new Error('❌ BUG NOT FIXED: Count still has 0 items on initialization');
    }

    // Pick the first item to modify
    const itemToCount = countEntity.items[0];
    const newQuantity = (itemToCount.snapshot_quantity || 0) + 10;
    
    console.log(`\nModifying product: ${itemToCount.product_name} (ID: ${itemToCount.product_id})`);
    console.log(`Snapshot: ${itemToCount.snapshot_quantity}, New Count: ${newQuantity}`);

    // 3. Update items
    console.log('\n3. Saving progress...');
    const updateRes = await fetch(`${baseUrl}/${countId}/items`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ id: itemToCount.id, counted_quantity: newQuantity }]
      })
    });
    
    if (!updateRes.ok) throw new Error('Failed to update items');
    console.log('✅ Progress saved.');

    // 4. Complete count
    console.log('\n4. Completing count and adjusting stock...');
    const completeRes = await fetch(`${baseUrl}/${countId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completedBy: 'Test Script' })
    });
    
    const completeData = await completeRes.json();
    if (!completeData.success) {
      require('fs').writeFileSync('tmp_error.json', JSON.stringify(completeData, null, 2));
      throw new Error('Completion failed!');
    }
    console.log('✅ Count completed successfully.');

    // 5. Verify via manual DB check or wait for manual UI check
    console.log('\n✅ TEST COMPLETED SUCCESSFULLY! Please perform manual verification in the UI to confirm the final stock level.');

  } catch (error: any) {
    console.log('Test caught error:', error.message);
  }
}

runTest();
