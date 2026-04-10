-- Add retry fields to external_api_logs to support automatic background sync
ALTER TABLE external_api_logs 
ADD COLUMN next_retry_at DATETIME NULL AFTER retry_count,
ADD COLUMN last_retry_at DATETIME NULL AFTER next_retry_at;

-- Create index on next_retry_at and status for efficient background polling
CREATE INDEX idx_sync_queue ON external_api_logs (status, next_retry_at);
