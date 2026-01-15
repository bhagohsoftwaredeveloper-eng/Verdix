const fetch = require('node-fetch');

async function testCreateUser() {
  try {
    console.log('Testing POST /api/users endpoint...');

    const userData = {
      username: 'testuser',
      password: 'testpass123',
      permissions: ['access_pos', 'view_dashboard']
    };

    const response = await fetch('http://localhost:9003/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    const responseText = await response.text();
    console.log('Response text:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('Success response:', data);
    } else {
      console.log('Error response:', responseText);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testCreateUser();
