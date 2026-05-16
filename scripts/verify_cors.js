const http = require('http');

async function verifyCors() {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/pos-terminals?activeOnly=true',
    method: 'GET',
    headers: {
        'Origin': 'file://' // Simulate Electron origin
    }
  };

  console.log('Testing CORS headers for /api/pos-terminals...');
  
  const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log('Headers:');
    console.log(`  Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin']}`);
    console.log(`  Access-Control-Allow-Methods: ${res.headers['access-control-allow-methods']}`);
    console.log(`  Access-Control-Allow-Headers: ${res.headers['access-control-allow-headers']}`);
    console.log(`  Access-Control-Allow-Credentials: ${res.headers['access-control-allow-credentials']}`);

    if (res.headers['access-control-allow-origin'] === '*') {
      console.log('\nSUCCESS: CORS headers are present and allow all origins.');
    } else {
      console.log('\nFAILURE: CORS headers are missing or incorrect.');
      process.exit(1);
    }
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
    process.exit(1);
  });

  req.end();
}

verifyCors();
