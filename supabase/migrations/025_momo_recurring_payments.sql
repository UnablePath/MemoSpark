-- Migration: MoMo Recurring Payments System
-- Description: Add tables for managing recurring mobile money payments

-- Create network enum
DO $$ BEGIN
    CREATE TYPE momo_network_enum AS ENUM ('mtn', 'vodafone', 'airteltigo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create subscription status enum
DO $$ BEGIN
    CREATE TYPE recurring_status_enum AS ENUM ('active', 'cancelled', 'payment_failed', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create payment attempt status enum
DO $$ BEGIN
    CREATE TYPE attempt_status_enum AS ENUM ('pending', 'success', 'failed', 'retry_scheduled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create MoMo recurring subscriptions table
CREATE TABLE IF NOT EXISTS momo_recurring_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,
    tier_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
    network momo_network_enum,
    status recurring_status_enum DEFAULT 'active',
    next_billing_date TIMESTAMPTZ NOT NULL,
    last_payment_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    cancelled_at TIMESTAMPTZ,
    
    -- Indexes for efficient querying
    CONSTRAINT unique_active_user_subscription UNIQUE (clerk_user_id, status) 
        DEFERRABLE INITIALLY DEFERRED
);

-- Create MoMo payment attempts table
CREATE TABLE IF NOT EXISTS momo_payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES momo_recurring_subscriptions(id) ON DELETE CASCADE,
    reference TEXT UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status attempt_status_enum DEFAULT 'pending',
    attempt_number INTEGER DEFAULT 1,
    next_retry_date TIMESTAMPTZ,
    failure_reason TEXT,
    paystack_data JSONB,
    transaction_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_momo_subscriptions_user_status 
    ON momo_recurring_subscriptions(clerk_user_id, status);

CREATE INDEX IF NOT EXISTS idx_momo_subscriptions_next_billing 
    ON momo_recurring_subscriptions(next_billing_date, status) 
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_momo_attempts_subscription 
    ON momo_payment_attempts(subscription_id);

CREATE INDEX IF NOT EXISTS idx_momo_attempts_reference 
    ON momo_payment_attempts(reference);

CREATE INDEX IF NOT EXISTS idx_momo_attempts_retry_date 
    ON momo_payment_attempts(next_retry_date, status) 
    WHERE status = 'retry_scheduled';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_momo_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_momo_subscriptions_updated_at 
    BEFORE UPDATE ON momo_recurring_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_momo_updated_at_column();

CREATE TRIGGER update_momo_attempts_updated_at 
    BEFORE UPDATE ON momo_payment_attempts
    FOR EACH ROW EXECUTE FUNCTION update_momo_updated_at_column();

-- Create view for subscription overview
CREATE OR REPLACE VIEW momo_subscription_overview AS
SELECT 
    mrs.id,
    mrs.clerk_user_id,
    mrs.tier_id,
    mrs.phone,
    mrs.email,
    mrs.amount,
    mrs.billing_period,
    mrs.network,
    mrs.status,
    mrs.next_billing_date,
    mrs.last_payment_date,
    mrs.created_at,
    COUNT(mpa.id) as total_attempts,
    COUNT(CASE WHEN mpa.status = 'success' THEN 1 END) as successful_attempts,
    COUNT(CASE WHEN mpa.status = 'failed' THEN 1 END) as failed_attempts,
    MAX(mpa.completed_at) as last_attempt_date
FROM momo_recurring_subscriptions mrs
LEFT JOIN momo_payment_attempts mpa ON mrs.id = mpa.subscription_id
GROUP BY mrs.id, mrs.clerk_user_id, mrs.tier_id, mrs.phone, mrs.email, 
         mrs.amount, mrs.billing_period, mrs.network, mrs.status, 
         mrs.next_billing_date, mrs.last_payment_date, mrs.created_at;

-- Add RLS (Row Level Security) policies
ALTER TABLE momo_recurring_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE momo_payment_attempts ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own subscriptions
CREATE POLICY "Users can view their own MoMo subscriptions" ON momo_recurring_subscriptions
    FOR SELECT USING (auth.uid()::text = clerk_user_id);

-- Policy for users to manage their own subscriptions
CREATE POLICY "Users can manage their own MoMo subscriptions" ON momo_recurring_subscriptions
    FOR ALL USING (auth.uid()::text = clerk_user_id);

-- Policy for service role to manage all subscriptions (for server-side operations)
CREATE POLICY "Service role can manage all MoMo subscriptions" ON momo_recurring_subscriptions
    FOR ALL USING (auth.role() = 'service_role');

-- Policy for payment attempts (only service role can manage)
CREATE POLICY "Service role can manage all MoMo payment attempts" ON momo_payment_attempts
    FOR ALL USING (auth.role() = 'service_role');

-- Policy for users to view their payment attempts
CREATE POLICY "Users can view their own MoMo payment attempts" ON momo_payment_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM momo_recurring_subscriptions 
            WHERE id = subscription_id 
            AND clerk_user_id = auth.uid()::text
        )
    );

-- Grant necessary permissions
GRANT ALL ON momo_recurring_subscriptions TO service_role;
GRANT ALL ON momo_payment_attempts TO service_role;
GRANT SELECT ON momo_subscription_overview TO service_role;
GRANT SELECT ON momo_recurring_subscriptions TO authenticated;
GRANT SELECT ON momo_payment_attempts TO authenticated;
GRANT SELECT ON momo_subscription_overview TO authenticated;

