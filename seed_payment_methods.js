const dotenv = require('dotenv');
dotenv.config();

const { query } = require('./lib/mysql');

async function seedPaymentMethods() {
  try {
    console.log('🌱 Seeding payment methods...');

    // Payment methods to seed
    const paymentMethods = [
      { id: 'pm_cash', name: 'Cash', is_active: true },
      { id: 'pm_credit_card', name: 'Credit Card', is_active: true },
      { id: 'pm_bank_transfer', name: 'Bank Transfer', is_active: true },
      { id: 'pm_paypal', name: 'PayPal', is_active: true },
      { id: 'pm_gcash', name: 'GCash', is_active: true },
      { id: 'pm_check', name: 'Check', is_active: true }
    ];

    // Insert payment methods
    for (const method of paymentMethods) {
      try {
        await query(
          'INSERT INTO payment_methods (id, name, is_active) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = VALUES(is_active)',
          [method.id, method.name, method.is_active]
        );
        console.log(`✅ Inserted/Updated payment method: ${method.name}`);
      } catch (error) {
        console.error(`❌ Error inserting payment method ${method.name}:`, error.message);
      }
    }

    console.log('🎉 Payment methods seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding payment methods:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedPaymentMethods();
