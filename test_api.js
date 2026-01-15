const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('Testing /api/users endpoint...');
    const response = await fetch('http://localhost:3000/api/users');
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    } else {
      const data = await response.json();
      console.log('Success response:', data);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testAPI();
