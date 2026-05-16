
import fetch from 'node-fetch';

async function check() {
  try {
    const url = 'http://localhost:9003/api/data-management/export/products';
    console.log(`Fetching ${url}...`);
    const res = await fetch(url);
    console.log('Status:', res.status);
    
    if (res.ok) {
      const text = await res.text();
      const lines = text.split('\n');
      console.log('--- CSV HEADERS ---');
      console.log(lines[0]);
      console.log('--- FIRST ROW ---');
      console.log(lines[1] || '(No Data)');
    } else {
      console.log('Error Body:', await res.text());
    }
  } catch (err) {
    console.error('Request failed:', err);
  }
}

check();
