import { registerMigration, Migration } from './runner';
import { db } from '@/lib/db';

const migration: Migration = {
  name: '012_create_pos_tables',
  timestamp: '2025-12-10_10-05-00',

  async up(): Promise<void> {
    // Create users table for POS cashiers
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        role VARCHAR(50) DEFAULT 'cashier',
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await db.$executeRawUnsafe(createUsersTable);
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)');
    console.log('✅ Users table created');

    // Create pos_terminals table
    const createPosTerminalsTable = `
      CREATE TABLE IF NOT EXISTS pos_terminals (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        location VARCHAR(255),
        ip_address VARCHAR(45),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await db.$executeRawUnsafe(createPosTerminalsTable);
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_pos_terminals_name ON pos_terminals(name)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_pos_terminals_is_active ON pos_terminals(is_active)');
    console.log('✅ POS terminals table created');

    // Create shifts table
    const createShiftsTable = `
      CREATE TABLE IF NOT EXISTS shifts (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        terminal_id VARCHAR(50),
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NULL,
        starting_cash DECIMAL(10,2) DEFAULT 0,
        expected_cash DECIMAL(10,2) DEFAULT 0,
        actual_cash DECIMAL(10,2) DEFAULT 0,
        cash_difference DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_shifts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_shifts_terminal FOREIGN KEY (terminal_id) REFERENCES pos_terminals(id) ON DELETE SET NULL
      )
    `;

    await db.$executeRawUnsafe(createShiftsTable);
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON shifts(user_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_shifts_terminal_id ON shifts(terminal_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time)');
    console.log('✅ Shifts table created');

    // Create pos_transactions table
    const createPosTransactionsTable = `
      CREATE TABLE IF NOT EXISTS pos_transactions (
        id VARCHAR(50) PRIMARY KEY,
        sale_id VARCHAR(50) NOT NULL,
        shift_id VARCHAR(50),
        user_id VARCHAR(50) NOT NULL,
        terminal_id VARCHAR(50),
        transaction_type VARCHAR(50) DEFAULT 'sale',
        subtotal DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        payment_method VARCHAR(100),
        payment_reference VARCHAR(255),
        customer_count INT DEFAULT 1,
        transaction_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        void_reason TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_pos_transactions_sale FOREIGN KEY (sale_id) REFERENCES sales_transactions(id) ON DELETE CASCADE,
        CONSTRAINT fk_pos_transactions_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL,
        CONSTRAINT fk_pos_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_pos_transactions_terminal FOREIGN KEY (terminal_id) REFERENCES pos_terminals(id) ON DELETE SET NULL
      )
    `;

    await db.$executeRawUnsafe(createPosTransactionsTable);
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_pos_transactions_sale_id ON pos_transactions(sale_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_pos_transactions_shift_id ON pos_transactions(shift_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_pos_transactions_user_id ON pos_transactions(user_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_pos_transactions_terminal_id ON pos_transactions(terminal_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_pos_transactions_transaction_type ON pos_transactions(transaction_type)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_pos_transactions_transaction_time ON pos_transactions(transaction_time)');
    console.log('✅ POS transactions table created');

    // Create pos_transaction_items table
    const createPosTransactionItemsTable = `
      CREATE TABLE IF NOT EXISTS pos_transaction_items (
        id VARCHAR(50) PRIMARY KEY,
        pos_transaction_id VARCHAR(50) NOT NULL,
        sale_item_id VARCHAR(50) NOT NULL,
        product_id VARCHAR(50) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        discount_percentage DECIMAL(5,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        line_total DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_pos_transaction_items_transaction FOREIGN KEY (pos_transaction_id) REFERENCES pos_transactions(id) ON DELETE CASCADE,
        CONSTRAINT fk_pos_transaction_items_sale_item FOREIGN KEY (sale_item_id) REFERENCES sale_items(id) ON DELETE CASCADE,
        CONSTRAINT fk_pos_transaction_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `;

    await db.$executeRawUnsafe(createPosTransactionItemsTable);
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_pos_transaction_items_transaction_id ON pos_transaction_items(pos_transaction_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_pos_transaction_items_sale_item_id ON pos_transaction_items(sale_item_id)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_pos_transaction_items_product_id ON pos_transaction_items(product_id)');
    console.log('✅ POS transaction items table created');
  },

  async down(): Promise<void> {
    // Drop tables in reverse order due to foreign key constraints
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS pos_transaction_items');
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS pos_transactions');
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS shifts');
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS pos_terminals');
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS users');
    console.log('✅ POS tables dropped');
  }
};

registerMigration(migration);
