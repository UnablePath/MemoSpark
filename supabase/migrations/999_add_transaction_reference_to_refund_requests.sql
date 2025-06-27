-- Add transaction_reference column to refund_requests table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'refund_requests' 
        AND column_name = 'transaction_reference'
    ) THEN
        ALTER TABLE refund_requests ADD COLUMN transaction_reference TEXT;
        CREATE INDEX idx_refund_requests_transaction_reference ON refund_requests(transaction_reference);
    END IF;
END $$; 