const { query } = require('../lib/mysql');

async function seedPointsPayment() {
  try {
    const id = 'pm_points';
    const name = 'POINTS';
    const isActive = true;
    const isReferenceRequired = false;

    await query(
      'INSERT INTO payment_methods (id, name, is_active, require_reference) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = VALUES(is_active), require_reference = VALUES(require_reference)',
      [id, name, isActive, isReferenceRequired]
    );
    console.log('✅ Payment method "POINTS" seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding "POINTS" payment method:', error);
  } finally {
    process.exit(0);
  }
}

seedPointsPayment();
