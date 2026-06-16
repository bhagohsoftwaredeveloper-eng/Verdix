import { registerMigration, Migration } from './runner';
import { query } from '../../lib/mysql';

export const migration: Migration = {
  name: '082_alter_pos_settings_add_vat_registration',
  timestamp: '2026-06-06_10-00-00',

  async up() {
    console.log('Running migration: 082_alter_pos_settings_add_vat_registration');

    // Add vat_registration column to pos_settings table.
    // Values: 'VAT' (VAT-registered) or 'NON_VAT' (Non-VAT registered).
    // Controls the TIN label shown in the POS receipt header.
    // Guarded: the pos-settings API may auto-add this column on first request.
    const existing = await query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'pos_settings' AND TABLE_SCHEMA = DATABASE() AND COLUMN_NAME = 'vat_registration'"
    );

    if (existing.length === 0) {
      await query(`ALTER TABLE pos_settings ADD COLUMN vat_registration VARCHAR(20) DEFAULT 'VAT'`);
      console.log('✅ pos_settings table altered: added vat_registration');
    } else {
      console.log('ℹ️ vat_registration column already exists, skipping');
    }
  },

  async down() {
    console.log('Rolling back migration: 082_alter_pos_settings_add_vat_registration');

    await query(`ALTER TABLE pos_settings DROP COLUMN vat_registration`);
    console.log('✅ pos_settings table altered: dropped vat_registration');
  }
};

registerMigration(migration);
