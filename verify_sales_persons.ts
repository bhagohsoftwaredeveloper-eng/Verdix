
import fetch from 'node-fetch';

async function main() {
  try {
    const response = await fetch('http://localhost:3000/api/sales-persons');
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
