// Load all migrations
import './001_initial_schema.ts';
import './002_drop_conversion_factor_from_units_of_measure.ts';
import './003_create_conversion_factors_table.ts';
import './004_alter_conversion_factors_id_length.ts';
import './005_remove_is_serialized_from_products.ts';
import './006_create_suppliers_table.ts';
import './007_alter_suppliers_table_add_fields.ts';
import './008_create_stock_adjustments_table.ts';
import './009_add_account_foreign_keys_to_products.ts';
import './010_create_stock_movements_table.ts';
import './011_create_sales_transactions_tables.ts';
import './012_create_pos_tables.ts';
import './013_create_sales_orders_table.ts';
import './014_alter_customers_table_add_fields.ts';
import './015_alter_sales_orders_add_new_fields.ts';
import './016_alter_customers_table_add_sales_fields.ts';
import './017_create_loyalty_points_settings_table.ts';
import './018_create_customer_loyalty_table.ts';
import './019_create_point_history_table.ts';
import './020_create_customer_payments_table.ts';
import './021_create_sales_invoices_table.ts';
import './022_create_warehouses_table.ts';
import './023_add_warehouse_foreign_key_to_products.ts';
import './024_alter_sales_invoices_add_sales_person.ts';
import './025_add_sales_person_foreign_keys.ts';
import './026_update_warehouse_foreign_key_constraint.ts';
import './027_create_purchase_orders_table.ts';
import './028_drop_account_foreign_keys_from_products.ts';
import './029_create_user_permissions_table.ts';
import './030_create_users_table.ts';
import './031_alter_users_table_remove_email.ts';
import './032_add_password_to_users_table.ts';
import './033_alter_loyalty_base_column.ts';
import './034_create_payment_details_tables.ts';
import './035_create_pos_settings_table.ts';
import './036_create_supplier_product_mapping.ts';
import './037_alter_pos_settings_add_contact_fields.ts';
import './038_create_supplier_payments_table.ts';
import './039_alter_suppliers_add_details.ts';
import './040_add_unique_constraint_conversion_factors.ts';
import './040_alter_products_add_vat_and_availability.ts';
import './042_alter_purchase_order_items_new_fields.ts';
import './043_alter_purchase_orders_add_tracking_fields.ts';
import './044_alter_purchase_orders_add_reference_number.ts';
import './045_add_tax_rates.ts';
import './046_add_markup_percentage_to_categories_brands.ts';
import './047_alter_sales_transactions_add_voided_status.ts';
import './048_alter_pos_settings_add_return_auth.ts';
import './049_alter_pos_settings_add_recent_sales_auth.ts';
import './050_create_bad_orders_table.ts';

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
