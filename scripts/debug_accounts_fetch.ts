
const API_URL = 'http://192.168.1.246:3000/api/accounts';

async function fetchAccounts() {
  try {
    // Replicating the logic from actions.ts
    let baseUrl = API_URL;
    if (baseUrl.endsWith('/api/accounts')) {
        baseUrl = baseUrl.replace('/api/accounts', '');
    }
    
    const endpoint = `${baseUrl}/api/accounts`;
    console.log(`Fetching from: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    console.log(`Status: ${response.status}`);
    
    if (!response.ok) {
        throw new Error(`Failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Data received:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

fetchAccounts();
