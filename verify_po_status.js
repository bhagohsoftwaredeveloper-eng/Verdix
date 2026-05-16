
async function verifyPOStatus() {
  const baseUrl = 'http://localhost:9003/api/purchase-orders';
  
  try {
    // 1. Get a PO
    console.log('Fetching purchase orders...');
    const res = await fetch(baseUrl + '?limit=1');
    const json = await res.json();
    
    if (!json.data || json.data.length === 0) {
      console.error('No POs found to test.');
      return;
    }
    
    const po = json.data[0];
    console.log(`Testing with PO ID: ${po.id}, Current Status: ${po.status}`);
    
    // 2. Determine new status
    const newStatus = po.status === 'Pending' ? 'Approved' : 'Pending';
    console.log(`Attempting to change status to: ${newStatus}`);
    
    // 3. Update Status
    const updateRes = await fetch(`${baseUrl}/${po.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
    });
    
    const result = await updateRes.json();
    console.log('Update Result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
        console.log('SUCCESS: Status updated.');
    } else {
        console.log('FAILURE: ' + result.error);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

verifyPOStatus();
