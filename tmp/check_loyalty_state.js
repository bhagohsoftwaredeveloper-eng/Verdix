const { query } = require('../lib/mysql');

async function checkLoyaltyInfo() {
  try {
    const paymentMethods = await query('SELECT * FROM payment_methods');
    console.log('\n--- Payment Methods ---');
    console.table(paymentMethods);

    const loyaltySettings = await query('SELECT * FROM loyalty_points_settings');
    console.log('\n--- Loyalty Settings ---');
    console.table(loyaltySettings);

    const customerLoyalty = await query('SELECT * FROM customer_loyalty LIMIT 5');
    console.log('\n--- Customer Loyalty (First 5) ---');
    console.table(customerLoyalty);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkLoyaltyInfo();
