import { registerMigration, Migration } from './runner';
import { query } from '../../src/lib/mysql';

const migration: Migration = {
  name: '001_initial_schema',
  timestamp: '2025-01-24_09-22-00',

  async up(): Promise<void> {
    // Create products table
    const createProductsTable = `
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        additional_description TEXT,
        category VARCHAR(100),
        brand VARCHAR(100),
        subcategory VARCHAR(100),
        stock INT DEFAULT 0,
        reorder_point INT DEFAULT 0,
        avg_daily_sales DECIMAL(10,2) DEFAULT 0,
        price DECIMAL(10,2) NOT NULL,
        cost DECIMAL(10,2),
        sku VARCHAR(100) UNIQUE,
        barcode VARCHAR(100),
        image_url VARCHAR(500),
        image_hint VARCHAR(255),

        unit_of_measure VARCHAR(50),
        parent_id VARCHAR(50),
        conversion_factor DECIMAL(10,2),
        income_account VARCHAR(50),
        expense_account VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES products(id)
      )
    `;

    await query(createProductsTable);
    console.log('✅ Products table created');

    // Create brands table
    const createBrandsTable = `
      CREATE TABLE IF NOT EXISTS brands (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await query(createBrandsTable);
    console.log('✅ Brands table created');

    // Create categories table
    const createCategoriesTable = `
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await query(createCategoriesTable);
    console.log('✅ Categories table created');

    // Create subcategories table
    const createSubcategoriesTable = `
      CREATE TABLE IF NOT EXISTS subcategories (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await query(createSubcategoriesTable);
    console.log('✅ Subcategories table created');

    // Create units of measure table
    const createUnitsTable = `
      CREATE TABLE IF NOT EXISTS units_of_measure (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        abbreviation VARCHAR(10),
        conversion_factor DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await query(createUnitsTable);
    console.log('✅ Units of measure table created');

    // Create accounts table for income and expense account selection
    const createAccountsTable = `
      CREATE TABLE IF NOT EXISTS accounts (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type ENUM('income', 'expense') NOT NULL,
        code VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_account_name (name),
        UNIQUE KEY unique_account_code (code)
      )
    `;

    await query(createAccountsTable);
    console.log('✅ Accounts table created');
  },

  async down(): Promise<void> {
    // Drop tables in reverse order due to foreign key constraints
    await query('DROP TABLE IF EXISTS accounts');
    await query('DROP TABLE IF EXISTS units_of_measure');
    await query('DROP TABLE IF EXISTS subcategories');
    await query('DROP TABLE IF EXISTS categories');
    await query('DROP TABLE IF EXISTS brands');
    await query('DROP TABLE IF EXISTS products');
    console.log('✅ Initial schema tables dropped');
  }
};

registerMigration(migration);
