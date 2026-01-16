
const fetch = require('node-fetch');

async function check() {
  try {
    const url = 'http://localhost:9003/api/data-management/export/products';
    console.log(`Fetching ${url}...`);
    const res = await fetch(url);
    console.log('Status:', res.status);
    console.log('Content-Type:', res.headers.get('content-type'));
    
    if (res.ok) {
      const text = await res.text();
      console.log('Body length:', text.length);
      console.log('Preview:');
      console.log(text.substring(0, 200));
    } else {
      console.log('Error Body:', await res.text());
    }
  } catch (err) {
    console.error('Request failed:', err);
  }
}

check();
