import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';
import { DEFAULT_UNITS_OF_MEASURE as DEFAULT_UNITS } from '../../lib/default-units';

// Standard Philippine retail units of measure, seeded so users don't have to
// hand-encode common units. The canonical list lives in lib/default-units.ts
// (shared with the data-reset endpoint). Stable ids (uom_seed_*) let down()
// remove exactly these rows without touching units the user added. INSERT
// IGNORE keeps the migration idempotent and never clobbers an existing name/id.

const migration: Migration = {
  name: '089_seed_default_units_of_measure',
  timestamp: '2026-06-30_00-00-00',

  async up(): Promise<void> {
    let inserted = 0;
    for (const u of DEFAULT_UNITS) {
      // INSERT IGNORE skips rows whose id or unique name already exists,
      // so units the user already added (e.g. their own "Kilogram") are kept.
      const result: any = await query(
        'INSERT IGNORE INTO units_of_measure (id, name, abbreviation) VALUES (?, ?, ?)',
        [u.id, u.name, u.abbreviation]
      );
      if (result?.affectedRows) inserted += result.affectedRows;
    }
    console.log(`✅ Seeded ${inserted} default unit(s) of measure (${DEFAULT_UNITS.length - inserted} already present, skipped)`);
  },

  async down(): Promise<void> {
    const ids = DEFAULT_UNITS.map((u) => u.id);
    const placeholders = ids.map(() => '?').join(', ');
    await query(`DELETE FROM units_of_measure WHERE id IN (${placeholders})`, ids);
    console.log('✅ Removed seeded default units of measure');
  },
};

registerMigration(migration);
