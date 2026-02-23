import { calculateEffectivePrice } from '../lib/pricing';
import { Product } from '../lib/types';

const mockProduct: Product = {
    id: 'test-p1',
    name: 'Test Product',
    description: 'Test',
    category: 'Test',
    brand: 'Test',
    stock: 100,
    reorderPoint: 10,
    avgDailySales: 1,
    price: 100, // Base Retail Price
    sku: 'TEST-SKU',
    imageUrl: '',
    imageHint: '',
    unitOfMeasure: 'pc',
    priceLevels: [
        { levelId: 'retail-level', price: 100, minQuantity: 1 },
        { levelId: 'wholesale-level', price: 80, minQuantity: 12 },
        { levelId: 'vip-level', price: 90, minQuantity: 1 }
    ]
};

function test(name: string, quantity: number, activeLevelId: string | undefined, expectedPrice: number) {
    const actualPrice = calculateEffectivePrice(mockProduct, quantity, activeLevelId);
    if (actualPrice === expectedPrice) {
        console.log(`✅ PASS: ${name} (Qty: ${quantity}, Level: ${activeLevelId}) => ${actualPrice}`);
    } else {
        console.error(`❌ FAIL: ${name} (Qty: ${quantity}, Level: ${activeLevelId}) => Expected ${expectedPrice}, got ${actualPrice}`);
        process.exit(1);
    }
}

console.log('--- Starting Pricing Logic Tests ---');

// Case 1: Retail quantity
test('Retail Level - Single Item', 1, 'retail-level', 100);

// Case 2: Wholesale quantity should trigger wholesale price even if on retail level
test('Wholesale Level - Hits Threshold', 12, 'retail-level', 80);

// Case 3: VIP level override
test('VIP Level - Single Item', 1, 'vip-level', 90);

// Case 4: VIP level with wholesale quantity (should take lowest price)
test('VIP Level - Hits Wholesale Threshold', 12, 'vip-level', 80);

// Case 5: Walk-in (no active level) - Standard Retail
test('No Level - Single Item', 1, undefined, 100);

// Case 6: Walk-in - Hits Wholesale Threshold
test('No Level - Hits Wholesale Threshold', 12, undefined, 80);

console.log('--- All Tests Passed! ---');
