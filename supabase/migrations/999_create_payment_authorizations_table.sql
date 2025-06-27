-- Create payment_authorizations table for storing Paystack authorization codes
CREATE TABLE IF NOT EXISTS payment_authorizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    authorization_code TEXT NOT NULL,
    bin TEXT,
    last4 TEXT,
    exp_month TEXT,
    exp_year TEXT,
    card_type TEXT,
    bank TEXT,
    channel TEXT,
    signature TEXT UNIQUE,
    reusable BOOLEAN DEFAULT true,
    country_code TEXT,
    account_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_payment_authorizations_user_id ON payment_authorizations(clerk_user_id);
CREATE INDEX idx_payment_authorizations_signature ON payment_authorizations(signature);
CREATE INDEX idx_payment_authorizations_reusable ON payment_authorizations(reusable);

-- Add RLS policies (you can enable RLS later if needed)
-- ALTER TABLE payment_authorizations ENABLE ROW LEVEL SECURITY;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_authorizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_payment_authorizations_updated_at 
    BEFORE UPDATE ON payment_authorizations
    FOR EACH ROW 
    EXECUTE FUNCTION update_payment_authorizations_updated_at();

-- Add comment
COMMENT ON TABLE payment_authorizations IS 'Stores Paystack authorization codes for recurring billing'; 