// Load all migrations
import './001_initial_schema';
import './002_drop_conversion_factor_from_units_of_measure';
import './003_create_conversion_factors_table';
import './004_alter_conversion_factors_id_length';
import './005_remove_is_serialized_from_products';
import './006_create_suppliers_table';
import './007_alter_suppliers_table_add_fields';
import './008_create_stock_adjustments_table';
import './009_add_account_foreign_keys_to_products';
import './010_create_stock_movements_table';
import './011_create_sales_transactions_tables';
import './012_create_pos_tables';
import './013_create_sales_orders_table';
import './014_alter_customers_table_add_fields';
import './015_alter_sales_orders_add_new_fields';
import './016_alter_customers_table_add_sales_fields';
import './017_create_loyalty_points_settings_table';
import './018_create_customer_loyalty_table';
import './019_create_point_history_table';
import './020_create_customer_payments_table';
import './021_create_sales_invoices_table';
import './022_create_warehouses_table';
import './023_add_warehouse_foreign_key_to_products';
import './024_alter_sales_invoices_add_sales_person';
import './025_add_sales_person_foreign_keys';
import './026_update_warehouse_foreign_key_constraint';
import './027_create_purchase_orders_table';
import './028_drop_account_foreign_keys_from_products';
import './029_create_user_permissions_table';
import './030_create_users_table';
import './031_alter_users_table_remove_email';
import './032_add_password_to_users_table';
import './033_alter_loyalty_base_column';
import './034_create_payment_details_tables';
import './035_create_pos_settings_table';

// Import runner functions
import { migrateUp, migrateDown } from './runner';

// Export the runner functions for CLI usage
export { migrateUp, migrateDown } from './runner';

// CLI runner
async function main() {
  const command = process.argv[2];

  if (command === 'up' || command === undefined) {
    await migrateUp();
  } else if (command === 'down') {
    await migrateDown();
  } else {
    console.log('Usage: tsx scripts/migrations/index.ts [up|down]');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
