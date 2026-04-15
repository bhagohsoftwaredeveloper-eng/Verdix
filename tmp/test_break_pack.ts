import { breakPack, getChildProducts } from '../app/(app)/products/actions';
import { query } from '../lib/mysql';

async function test() {
  console.log('--- Starting Break Pack Verification ---');
  
  // 1. Setup - find a parent and child
  const products: any = await query('SELECT p.id as parentId, c.id as childId, p.stock as pStock, c.stock as cStock, c.conversion_factor, p.name as pName, c.name as cName FROM products p JOIN products c ON c.parent_id = p.id LIMIT 1');
  
  if (products.length === 0) {
    console.log('No parent-child product relationship found in database to test.');
    return;
  }

  const { parentId, childId, pStock, cStock, conversion_factor, pName, cName } = products[0];
  
  // Test getChildProducts
  console.log('Testing getChildProducts...');
  const fetchedChildren = await getChildProducts(parentId);
  const found = fetchedChildren.some(c => c.id === childId);
  console.log(`Found child in getChildProducts result: ${found}`);
  
  const factor = parseFloat(conversion_factor) || 1;
  const breakQty = 1;

  console.log(`Testing with Parent: ${pName} (${parentId}) [Current Stock: ${pStock}]`);
  console.log(`Testing with Child: ${cName} (${childId}) [Current Stock: ${cStock}, Factor: ${factor}]`);

  let initialPStock = parseFloat(pStock);
  if (initialPStock < breakQty) {
    console.log('Insufficient parent stock for test. Updating parent stock to 10...');
    await query('UPDATE products SET stock = 10 WHERE id = ?', [parentId]);
    initialPStock = 10;
  }

  // 2. Perform Break Pack
  console.log(`Breaking ${breakQty} unit(s) of parent...`);
  const result = await breakPack(parentId, childId, breakQty);
  
  if (!result.success) {
    console.error('Break pack failed:', result.message);
    return;
  }

  console.log('Break pack success message:', result.message);

  // 3. Verify Results
  const [newParent]: any = await query('SELECT stock FROM products WHERE id = ?', [parentId]);
  const [newChild]: any = await query('SELECT stock FROM products WHERE id = ?', [childId]);

  const expectedPStock = initialPStock - breakQty;
  const expectedCStock = parseFloat(cStock) + (breakQty * factor);

  console.log(`New Parent Stock: ${newParent.stock} (Expected: ${expectedPStock})`);
  console.log(`New Child Stock: ${newChild.stock} (Expected: ${expectedCStock})`);

  const pSuccess = Math.abs(parseFloat(newParent.stock) - expectedPStock) < 0.01;
  const cSuccess = Math.abs(parseFloat(newChild.stock) - expectedCStock) < 0.01;

  // 4. Verify Stock Movements
  const movements: any = await query('SELECT * FROM stock_movements WHERE reference_type = "break_pack" AND (reference_id = ? OR reference_id = ?) ORDER BY created_at DESC LIMIT 2', [parentId, childId]);
  console.log(`Found ${movements.length} stock movement(s) for this action.`);
  
  if (pSuccess && cSuccess && movements.length === 2) {
    console.log('\n--- VERIFICATION SUCCESSFUL ---');
  } else {
    console.log('\n--- VERIFICATION FAILED ---');
    if (!pSuccess) console.log(`- Parent stock mismatch: got ${newParent.stock}, expected ${expectedPStock}`);
    if (!cSuccess) console.log(`- Child stock mismatch: got ${newChild.stock}, expected ${expectedCStock}`);
    if (movements.length !== 2) console.log(`- Expected 2 stock movements, found ${movements.length}`);
  }
}

test().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
