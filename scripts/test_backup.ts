
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:9003/api/settings/backup';

async function testBackup() {
  try {
    console.log('--- Testing Manual Backup ---');
    const res = await fetch(`${BASE_URL}/manual`, { method: 'POST' });
    const text = await res.text();
    try {
        const data = JSON.parse(text);
        console.log('Create Response:', res.status, data);
    } catch(e) {
        console.log('Create Response Status:', res.status);
        console.log('Body:', text.substring(0, 500));
    }

    console.log('\n--- Listing Backups ---');
    const listRes = await fetch(`${BASE_URL}/files`);
    const files = await listRes.json();
    console.log('Files Found:', Array.isArray(files) ? files.length : files);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testBackup();
