
import fetch from 'node-fetch';

async function checkApi() {
  try {
    const res = await fetch('http://localhost:3005/api/pos/recent-sales?terminalId=TERMINAL-1');
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(`Body: ${text}`);
  } catch (error) {
    console.error('Fetch failed:', error);
  }
}

checkApi();
