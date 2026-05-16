-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_number VARCHAR(50),
  payment_terms VARCHAR(100),
  loyalty_points INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_contact_number (contact_number)
);

-- Create products table (if not exists)
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES products(id)
);

-- Create sales_transactions table
CREATE TABLE IF NOT EXISTS sales_transactions (
  id VARCHAR(50) PRIMARY KEY,
  customer_id VARCHAR(50),
  invoice_date DATE,
  date DATE,
  due_date DATE,
  total DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(100),
  status ENUM('Paid', 'Pending', 'Failed', 'Shipped', 'Delivered', 'Returned', 'Partially Paid') DEFAULT 'Pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  INDEX idx_customer_id (customer_id),
  INDEX idx_date (date),
  INDEX idx_invoice_date (invoice_date),
  INDEX idx_status (status),
  INDEX idx_payment_method (payment_method)
);

-- Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
  id VARCHAR(50) PRIMARY KEY,
  sale_id VARCHAR(50) NOT NULL,
  product_id VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales_transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_sale_id (sale_id),
  INDEX idx_product_id (product_id)
);

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_is_active (is_active)
);

-- Insert some sample data
INSERT IGNORE INTO customers (id, name, contact_number, payment_terms) VALUES
('1', 'Juan Dela Cruz', '09123456789', 'Net 30'),
('2', 'Maria Santos', '09876543210', 'Due on receipt'),
('3', 'Pedro Reyes', '09111222333', 'Net 15');

INSERT IGNORE INTO products (id, name, description, category, brand, stock, price, sku, barcode, unit_of_measure) VALUES
('1', 'Coca-Cola 1.5L', 'Soft drink', 'Beverages', 'Coca-Cola', 150, 75.00, 'CC150', '4800016945486', 'Piece'),
('2', 'Nike Shoes Air Max', 'Running shoes', 'Footwear', 'Nike', 10, 5500.00, 'NSAM001', '0888375260387', 'Pair'),
('3', 'Rice Premium 1kg', 'Premium quality rice', 'Food', 'Premium Rice', 200, 45.00, 'PR1KG', '123456789012', 'Kilogram');

INSERT IGNORE INTO payment_methods (id, name) VALUES
('1', 'Cash'),
('2', 'Credit Card'),
('3', 'Debit Card'),
('4', 'Bank Transfer'),
('5', 'Check'),
('6', 'PayPal'),
('7', 'GCash');
