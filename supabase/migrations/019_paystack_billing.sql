-- Migration: Paystack Payment Integration
-- Description: Add tables for payment transactions and update subscription schema for Paystack

-- Create payment status enum
DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM ('pending', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL REFERENCES profiles(clerk_user_id) ON DELETE CASCADE,
    reference TEXT UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'GHS', -- Ghana Cedis
    tier_id TEXT NOT NULL,
    billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
    status payment_status_enum DEFAULT 'pending',
    payment_provider TEXT DEFAULT 'paystack',
    paystack_transaction_id BIGINT,
    gateway_response TEXT,
    paid_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add Paystack columns to user_subscriptions if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'paystack_customer_id') THEN
        ALTER TABLE user_subscriptions ADD COLUMN paystack_customer_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_subscriptions' AND column_name = 'paystack_subscription_code') THEN
        ALTER TABLE user_subscriptions ADD COLUMN paystack_subscription_code TEXT;
    END IF;
END $$;

-- Create payment_history view for billing portal
CREATE OR REPLACE VIEW payment_history AS
SELECT 
    pt.id,
    pt.clerk_user_id,
    pt.reference,
    pt.amount,
    pt.currency,
    pt.tier_id,
    st.display_name as tier_name,
    pt.billing_period,
    pt.status,
    pt.payment_provider,
    pt.paid_at,
    pt.created_at,
    pt.gateway_response
FROM payment_transactions pt
LEFT JOIN subscription_tiers st ON pt.tier_id = st.id
WHERE pt.status = 'completed'
ORDER BY pt.paid_at DESC;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_clerk_user_id ON payment_transactions(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_paystack_customer ON user_subscriptions(paystack_customer_id);

-- Enable RLS on payment_transactions
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payment_transactions
CREATE POLICY "Users can view their own payment transactions"
    ON payment_transactions FOR SELECT
    USING (
        clerk_user_id = (
            SELECT clerk_user_id 
            FROM profiles 
            WHERE profiles.clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

CREATE POLICY "Users can insert their own payment transactions"
    ON payment_transactions FOR INSERT
    WITH CHECK (
        clerk_user_id = (
            SELECT clerk_user_id 
            FROM profiles 
            WHERE profiles.clerk_user_id = auth.jwt() ->> 'sub'
        )
    );

-- Grant permissions for service role (for API operations)
GRANT ALL ON payment_transactions TO service_role;
GRANT SELECT ON payment_history TO authenticated, service_role;

-- Insert default subscription tiers with new pricing (Ghana Cedis)
INSERT INTO subscription_tiers (id, name, display_name, description, price_monthly, price_yearly, ai_requests_per_day, ai_requests_per_month, features, is_active)
VALUES 
    ('free', 'free', 'Free', 'Basic AI assistance with limited requests', 0, 0, 10, 300, '{"basic_ai": true, "task_suggestions": true}', true),
    ('premium', 'premium', 'Premium', 'Full AI capabilities with enhanced features', 20, 212, 100, 3000, '{"basic_ai": true, "task_suggestions": true, "study_planning": true, "voice_notes": true, "premium_features": true, "priority_support": true}', true)
ON CONFLICT (id) DO UPDATE SET
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    description = EXCLUDED.description,
    features = EXCLUDED.features,
    updated_at = now(); 