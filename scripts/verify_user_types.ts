import { getApiUrl } from '../lib/api-config';


async function testUserTypes() {
  const host = 'http://localhost:3000/api';
  console.log('🚀 Testing User Types API at ' + host + '...');

  try {
    // 1. GET User Types
    console.log('\n--- 1. Testing GET /api/user-types ---');
    const getRes = await fetch(`${host}/user-types`);

    const userTypes = await getRes.json();
    console.log(`Found ${userTypes.length} user types:`, userTypes.map((t: any) => t.name).join(', '));

    if (userTypes.length === 0) {
      throw new Error('No user types found. Seed might have failed.');
    }

    // 2. POST New User Type
    console.log('\n--- 2. Testing POST /api/user-types ---');
    const newTypeName = 'Test Role ' + Date.now();
    const createRes = await fetch(`${host}/user-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newTypeName,
        description: 'A test role created by script',
        permissions: ['access_pos', 'view_dashboard']
      }),
    });
    const createdType = await createRes.json();
    console.log('Created user type:', createdType);

    if (!createdType.id) {
      throw new Error('Failed to create user type.');
    }

    // 3. PATCH User Type
    console.log('\n--- 3. Testing PATCH /api/user-types/[id] ---');
    const patchRes = await fetch(`${host}/user-types/${createdType.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Updated test role description',
        permissions: ['access_pos']
      }),
    });
    const patchResult = await patchRes.json();
    console.log('Patch result:', patchResult);

    if (!patchResult.success) {
      throw new Error('Failed to update user type.');
    }

    // 4. DELETE User Type
    console.log('\n--- 4. Testing DELETE /api/user-types/[id] ---');
    const deleteRes = await fetch(`${host}/user-types/${createdType.id}`, {
      method: 'DELETE',
    });

    const deleteResult = await deleteRes.json();
    console.log('Delete result:', deleteResult);

    if (!deleteResult.success) {
      throw new Error('Failed to delete user type.');
    }

    console.log('\n✅ User Types API verification successful!');
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

testUserTypes();
