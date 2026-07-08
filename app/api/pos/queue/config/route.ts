import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/mysql';

async function ensureCounterTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS pos_queue_counter (
      id INT PRIMARY KEY DEFAULT 1,
      current_number INT NOT NULL DEFAULT 0,
      max_number INT NOT NULL DEFAULT 999,
      auto_reset_daily TINYINT(1) NOT NULL DEFAULT 1,
      last_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_reset_date DATE DEFAULT (CURDATE())
    )
  `);

  // Ensure single row exists
  await query(`
    INSERT IGNORE INTO pos_queue_counter (id) VALUES (1)
  `);

  // Add columns to existing table if missing
  const existing = await query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_NAME = 'pos_queue_counter' AND TABLE_SCHEMA = DATABASE()`
  ) as any[];
  const cols = new Set(existing.map((c: any) => c.COLUMN_NAME));

  if (!cols.has('last_reset_date')) {
    await query(`ALTER TABLE pos_queue_counter ADD COLUMN last_reset_date DATE NULL AFTER last_reset_at`);
    await query(`UPDATE pos_queue_counter SET last_reset_date = DATE(last_reset_at) WHERE id = 1`);
  }
}

// GET - return current counter state + config
export async function GET() {
  try {
    await ensureCounterTable();
    const [row] = await query(
      `SELECT current_number AS currentNumber, max_number AS maxNumber,
              auto_reset_daily AS autoResetDaily,
              last_reset_at AS lastResetAt, last_reset_date AS lastResetDate
       FROM pos_queue_counter WHERE id = 1`
    ) as any[];

    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    console.error('Queue config GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch queue config' }, { status: 500 });
  }
}

// PUT - update config or reset counter
export async function PUT(request: NextRequest) {
  try {
    await ensureCounterTable();
    const body = await request.json();
    const { action, maxNumber, autoResetDaily } = body;

    if (action === 'reset') {
      await query(
        `UPDATE pos_queue_counter
         SET current_number = 0, last_reset_at = NOW(), last_reset_date = CURDATE()
         WHERE id = 1`
      );
      return NextResponse.json({ success: true, message: 'Queue counter reset to 1' });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (maxNumber !== undefined) {
      const max = Math.max(1, Math.min(9999, parseInt(maxNumber)));
      updates.push('max_number = ?');
      values.push(max);
    }
    if (autoResetDaily !== undefined) {
      updates.push('auto_reset_daily = ?');
      values.push(autoResetDaily ? 1 : 0);
    }

    if (updates.length > 0) {
      values.push(1);
      await query(`UPDATE pos_queue_counter SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    return NextResponse.json({ success: true, message: 'Queue config updated' });
  } catch (error) {
    console.error('Queue config PUT error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update queue config' }, { status: 500 });
  }
}
