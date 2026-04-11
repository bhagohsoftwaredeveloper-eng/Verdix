import { calculatePurchaseCosts } from '../lib/purchase-utils';

const testItems = [
  {
    productId: 'prod1',
    productName: 'Item 1',
    quantity: 10,
    cost: 100, // Subtotal: 1000
    vatSubject: true
  },
  {
    productId: 'prod2',
    productName: 'Item 2',
    quantity: 5,
    cost: 200, // Subtotal: 1000
    discount: 10,
    discountType: 'percentage' as const, // Subtotal: 1000 - 100 = 900
    vatSubject: false
  }
];

const shippingFee = 150;
const results = calculatePurchaseCosts(testItems, shippingFee);

console.log('--- Purchase Cost Calculation Test (Per-Item-Line Strategy) ---');
console.log('Items:', testItems.length);
console.log('Shipping Fee:', shippingFee);

console.log('\nResults:');
console.log('Subtotal:', results.subtotal); // Expected: 1900
console.log('Grand Total:', results.grandTotal); // Expected: 1900 + 150 = 2050

console.log('\nItem Details (Landed Cost):');
results.items.forEach(item => {
  console.log(`- ${item.productName}:`);
  console.log(`  Line Total: ${item.lineTotal}`);
  console.log(`  Shipping Allocation: ${item.shippingAllocation.toFixed(2)}`); // Expected: 150 / 2 = 75
  console.log(`  Landed Cost Total: ${item.landedCostTotal.toFixed(2)}`); // Expected: Line Total + 75
  console.log(`  Landed Cost Per Unit: ${item.landedCostPerUnit.toFixed(2)}`);
});

// Verification checks
// Allocation per line: 150 / 2 = 75
if (Math.abs(results.items[0].shippingAllocation - 75) > 0.01) console.error('FAILED: Item 1 allocation mismatch');
if (Math.abs(results.items[1].shippingAllocation - 75) > 0.01) console.error('FAILED: Item 2 allocation mismatch');

// Item 1 Unit Landed Cost: (1000 + 75) / 10 = 107.5
if (Math.abs(results.items[0].landedCostPerUnit - 107.5) > 0.01) console.error('FAILED: Item 1 landed cost per unit mismatch');

// Item 2 Unit Landed Cost: (900 + 75) / 5 = 195
if (Math.abs(results.items[1].landedCostPerUnit - 195) > 0.01) console.error('FAILED: Item 2 landed cost per unit mismatch');

console.log('\n--- Test Completed ---');
