import { query } from './lib/mysql';

async function testLookup() {
    const terminalId = 'terminal_1771818038687';
    console.log('Testing lookup for terminal:', terminalId);

    const activeShiftResult = await query(
        `SELECT s.id, s.user_id, s.starting_cash, u.display_name as cashier_name
         FROM shifts s
         LEFT JOIN users u ON s.user_id = u.uid
         WHERE s.terminal_id = ? AND s.status = 'active'
         ORDER BY s.created_at DESC
         LIMIT 1`,
        [terminalId]
    );

    console.log('Result:', JSON.stringify(activeShiftResult, null, 2));

    const checkAll = await query('SELECT id, terminal_id, status FROM shifts WHERE terminal_id = ?', [terminalId]);
    console.log('All shifts for this terminal:', JSON.stringify(checkAll, null, 2));
}

testLookup();
