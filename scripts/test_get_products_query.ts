
import { query } from '../lib/mysql';

async function testGetProducts() {
  try {
    console.log('Testing getProducts query...');
    
    // Simulate getProducts query directly
    let sql = `
       SELECT p.*, 
              s_legacy.name as legacy_supplier_name, 
              w.name as warehouse_name,
              spm.supplier_id as primary_supplier_id,
              spm.supplier_specific_rop as primary_supplier_rop,
              s_primary.name as primary_supplier_name
       FROM products p
       LEFT JOIN suppliers s_legacy ON p.supplier_id = s_legacy.id
       LEFT JOIN warehouses w ON p.warehouse_id = w.id
       LEFT JOIN supplier_product_mapping spm ON p.id = spm.product_id AND spm.is_primary = 1
       LEFT JOIN suppliers s_primary ON spm.supplier_id = s_primary.id
       LIMIT 5
    `;
    
    const results = await query(sql);
    console.log('Query execute successfully. Count:', results.length);
    if(results.length > 0) {
        console.log('Sample product:', results[0]);
    } else {
        console.log('No products found with JOINs.');
    }

  } catch (error) {
    console.error('Error executing query with JOINs:', error);
  }
}

testGetProducts();
