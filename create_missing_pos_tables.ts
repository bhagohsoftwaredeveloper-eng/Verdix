import { query } from './lib/mysql';

async function createPosTables() {
    try {
        console.log('--- Creating POS Tables ---');

        // 1. pos_terminals
        await query(`
            CREATE TABLE IF NOT EXISTS pos_terminals (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                location VARCHAR(255),
                ip_address VARCHAR(45),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_name (name),
                INDEX idx_is_active (is_active)
            )
        `);
        console.log('✅ pos_terminals created');

        // 2. shifts (linked to users.uid)
        await query(`
            CREATE TABLE IF NOT EXISTS shifts (
                id VARCHAR(50) PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                terminal_id VARCHAR(50),
                start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                end_time TIMESTAMP NULL,
                starting_cash DECIMAL(10,2) DEFAULT 0,
                expected_cash DECIMAL(10,2) DEFAULT 0,
                actual_cash DECIMAL(10,2) DEFAULT 0,
                cash_difference DECIMAL(10,2) DEFAULT 0,
                status ENUM('active', 'completed', 'reconciled') DEFAULT 'active',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE,
                FOREIGN KEY (terminal_id) REFERENCES pos_terminals(id) ON DELETE SET NULL,
                INDEX idx_user_id (user_id),
                INDEX idx_terminal_id (terminal_id),
                INDEX idx_status (status),
                INDEX idx_start_time (start_time)
            )
        `);
        console.log('✅ shifts created');

        // 3. pos_transactions
        await query(`
            CREATE TABLE IF NOT EXISTS pos_transactions (
                id VARCHAR(50) PRIMARY KEY,
                sale_id VARCHAR(50) NOT NULL,
                shift_id VARCHAR(50),
                user_id VARCHAR(255) NOT NULL,
                terminal_id VARCHAR(50),
                transaction_type ENUM('sale', 'void', 'return', 'refund') DEFAULT 'sale',
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
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (sale_id) REFERENCES sales_transactions(id) ON DELETE CASCADE,
                FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL,
                FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE,
                FOREIGN KEY (terminal_id) REFERENCES pos_terminals(id) ON DELETE SET NULL,
                INDEX idx_sale_id (sale_id),
                INDEX idx_shift_id (shift_id),
                INDEX idx_user_id (user_id),
                INDEX idx_terminal_id (terminal_id),
                INDEX idx_transaction_type (transaction_type),
                INDEX idx_transaction_time (transaction_time)
            )
        `);
        console.log('✅ pos_transactions created');

        // 4. pos_transaction_items
        await query(`
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
                FOREIGN KEY (pos_transaction_id) REFERENCES pos_transactions(id) ON DELETE CASCADE,
                FOREIGN KEY (sale_item_id) REFERENCES sale_items(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                INDEX idx_pos_transaction_id (pos_transaction_id),
                INDEX idx_sale_item_id (sale_item_id),
                INDEX idx_product_id (product_id)
            )
        `);
        console.log('✅ pos_transaction_items created');

    } catch (error) {
        console.error('Error creating POS tables:', error);
    } finally {
        process.exit();
    }
}

createPosTables();
