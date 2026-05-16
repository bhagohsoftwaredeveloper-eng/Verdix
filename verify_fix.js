const fetch = require('node-fetch');

async function verifyFix() {
    try {
        const response = await fetch('http://localhost:3000/api/sales/z-reading?mode=history');
        const data = await response.json();
        
        if (data.success) {
            console.log('API Request Successful');
            console.log('Found ' + data.data.length + ' records');
            
            let allValid = true;
            data.data.forEach((record, index) => {
                const isArray = Array.isArray(record.paymentMethods);
                console.log(`Record ${index} (ID: ${record.id}): paymentMethods is Array? ${isArray}`);
                if (!isArray) {
                    console.error('INVALID FORMAT: ', record.paymentMethods);
                    allValid = false;
                } else {
                    console.log('preview:', JSON.stringify(record.paymentMethods).substring(0, 50) + '...');
                }
            });
            
            if (allValid) {
                console.log('VERIFICATION PASSED: All records have paymentMethods as array.');
            } else {
                console.error('VERIFICATION FAILED: Some records have invalid paymentMethods.');
            }
        } else {
            console.error('API Error:', data);
        }
    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

verifyFix();
