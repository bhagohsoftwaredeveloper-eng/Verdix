async function verifySettings() {
    const baseUrl = 'http://localhost:3000/api/pos-settings';
    
    console.log('--- Fetching initial settings ---');
    try {
        const getRes = await fetch(baseUrl);
        const getData = await getRes.json();
        console.log('GET Data:', JSON.stringify(getData.data, null, 2));

        const testSettings = {
            lowStockThreshold: 25,
            enableEmailNotifications: 1, // Using number for boolean compatibility check
            notificationEmail: 'test@example.com',
            enablePushNotifications: 0
        };

        console.log('\n--- Saving test settings ---');
        const postRes = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testSettings)
        });
        const postData = await postRes.json();
        console.log('POST Response:', postData);

        console.log('\n--- Verifying saved settings ---');
        const verifyRes = await fetch(baseUrl);
        const verifyData = await verifyRes.json();
        console.log('Verified Data:', JSON.stringify(verifyData.data, null, 2));

        const success = 
            verifyData.data.lowStockThreshold === 25 &&
            (verifyData.data.enableEmailNotifications === 1 || verifyData.data.enableEmailNotifications === true) &&
            verifyData.data.notificationEmail === 'test@example.com' &&
            (verifyData.data.enablePushNotifications === 0 || verifyData.data.enablePushNotifications === false);

        if (success) {
            console.log('\n✅ Verification SUCCESSFUL');
        } else {
            console.log('\n❌ Verification FAILED');
        }
    } catch (e) {
        console.error('Error during verification:', e);
    }
}

verifySettings();
