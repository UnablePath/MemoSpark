-- Migration: Add refund requests table
-- Description: Add table to track refund requests from users

-- Create refund_requests table
CREATE TABLE refund_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    subscription_id UUID REFERENCES user_subscriptions(id),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'processed')),
    admin_notes TEXT,
    refund_amount DECIMAL(10, 2),
    refund_currency TEXT DEFAULT 'GHS',
    payment_reference TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_refund_requests_user ON refund_requests(clerk_user_id);
CREATE INDEX idx_refund_requests_status ON refund_requests(status);
CREATE INDEX idx_refund_requests_requested_at ON refund_requests(requested_at);

-- Enable RLS
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for refund_requests
CREATE POLICY "Users can view own refund requests" ON refund_requests
    FOR SELECT USING (true); -- Allow all for now since we're using anon key

CREATE POLICY "Users can insert own refund requests" ON refund_requests
    FOR INSERT WITH CHECK (true); -- Allow all for now since we're using anon key

-- Allow service role full access
GRANT ALL ON refund_requests TO service_role;
GRANT SELECT, INSERT ON refund_requests TO anon;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_refund_requests_updated_at 
    BEFORE UPDATE ON refund_requests 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE refund_requests IS 'Stores refund requests from users';
COMMENT ON COLUMN refund_requests.status IS 'Status of refund request: pending, approved, denied, processed';
COMMENT ON COLUMN refund_requests.refund_amount IS 'Amount to be refunded in the specified currency';
COMMENT ON COLUMN refund_requests.payment_reference IS 'Reference to the original payment transaction'; 