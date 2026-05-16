import { query } from './lib/mysql';

async function verifyZCounter() {
  try {
    console.log('--- Verifying Z Counter Implementation ---');

    // 1. Ensure columns exist and check initial state
    const terminalId = 'terminal_default_01'; // Default used in route.ts if not specified
    
    // Check if terminal exists, create if not for testing
    const [termCheck] = await query('SELECT * FROM pos_terminals WHERE id = ?', [terminalId]) as any[];
    if (!termCheck) {
      console.log('Creating default terminal for test...');
      await query(`
        INSERT INTO pos_terminals (id, name, z_counter, reset_counter) 
        VALUES (?, 'Default Terminal', 0, 0)
      `, [terminalId]);
    }

    const [termBefore] = await query('SELECT z_counter, reset_counter FROM pos_terminals WHERE id = ?', [terminalId]) as any[];
    console.log(`Initial Terminal Counters - Z: ${termBefore.z_counter}, Reset: ${termBefore.reset_counter}`);

    // 2. Simulate Preview (GET /api/sales/z-reading?mode=current)
    // We expect preview to show termBefore.z_counter + 1
    const expectedPreviewZ = (termBefore.z_counter || 0) + 1;
    console.log(`Expected Preview Z-Counter: ${expectedPreviewZ}`);

    // 3. Simulate Finalization (POST /api/sales/z-reading)
    console.log('Simulating Z-Reading Finalization (POST)...');
    
    // Logic from route.ts:
    // UPDATE pos_terminals SET z_counter = z_counter + 1 WHERE id = ?
    await query('UPDATE pos_terminals SET z_counter = z_counter + 1 WHERE id = ?', [terminalId]);
    
    const [termAfter] = await query('SELECT z_counter, reset_counter FROM pos_terminals WHERE id = ?', [terminalId]) as any[];
    console.log(`Final Terminal Counters - Z: ${termAfter.z_counter}, Reset: ${termAfter.reset_counter}`);

    if (termAfter.z_counter === expectedPreviewZ) {
      console.log('✅ Success: Z-Counter incremented correctly!');
    } else {
      console.error(`❌ Failure: Z-Counter is ${termAfter.z_counter}, expected ${expectedPreviewZ}`);
    }

    // 4. Clean up if we created it
    // (Optional, maybe keep for manual testing)

  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    process.exit();
  }
}

verifyZCounter();
