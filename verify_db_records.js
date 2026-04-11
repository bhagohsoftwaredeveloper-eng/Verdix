
const { query } = require('./lib/mysql');

async function verifyStockMovements() {
  try {
    const movements = await query('SELECT * FROM stock_movements WHERE movement_type = ? ORDER BY created_at DESC LIMIT 5', ['purchase']);
    console.log('Recent Purchase Stock Movements:');
    console.log(JSON.stringify(movements, null, 2));
    
    if (movements.length > 0) {
      console.log('SUCCESS: Stock movements found!');
    } else {
      console.error('FAILURE: No stock movements found for purchases.');
    }

    const priceLevels = await query('SELECT * FROM product_price_levels ORDER BY updated_at DESC LIMIT 5');
    console.log('Recent Product Price Levels:');
    console.log(JSON.stringify(priceLevels, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

// Since I'm using require('./lib/mysql'), I need to make sure the environment is set up (compiled vs source)
// This project seems to use tsx for scripts, but I can try running it directly if mysql.ts is compatible or if there's a compiled version.
// Looking at package.json, they use tsx.
verifyStockMovements();
