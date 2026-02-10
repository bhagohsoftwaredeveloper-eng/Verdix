-- Create external_api_logs table for tracking API sync operations
CREATE TABLE IF NOT EXISTS external_api_logs (
  id VARCHAR(50) PRIMARY KEY,
  transaction_type VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(50) NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  payload TEXT,
  response TEXT,
  status VARCHAR(20) NOT NULL,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_transaction_type (transaction_type),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Create external_api_settings table for storing configuration
CREATE TABLE IF NOT EXISTS external_api_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO external_api_settings (setting_key, setting_value) VALUES
  ('enabled', 'false'),
  ('api_endpoint', ''),
  ('auth_type', 'api_key'),
  ('api_key', ''),
  ('bearer_token', ''),
  ('timeout', '30000'),
  ('retry_attempts', '3'),
  ('retry_delay', '2000'),
  ('sync_mode', 'realtime'),
  ('on_error_action', 'log_only')
ON DUPLICATE KEY UPDATE setting_value = setting_value;
