-- Fix ambiguous column reference in spend_user_coins function
-- The issue is that there's a local variable 'current_balance' and a table column with the same name

CREATE OR REPLACE FUNCTION spend_user_coins(
    p_user_id UUID,
    p_amount INTEGER,
    p_source TEXT,
    p_description TEXT,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
    user_balance INTEGER;  -- Renamed from current_balance to avoid ambiguity
    transaction_successful BOOLEAN := false;
BEGIN
    -- Validate amount is positive
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Coin amount must be positive';
    END IF;
    
    -- Get current balance from user_stats table
    SELECT COALESCE(coins, 0) INTO user_balance
    FROM user_stats
    WHERE user_id = p_user_id;
    
    -- Check if user has enough coins
    IF user_balance >= p_amount THEN
        -- Update user stats
        UPDATE user_stats 
        SET coins = coins - p_amount, updated_at = NOW()
        WHERE user_id = p_user_id;
        
        -- Record transaction
        INSERT INTO coin_transactions (user_id, amount, transaction_type, source, description, metadata)
        VALUES (p_user_id, -p_amount, 'spent', p_source, p_description, p_metadata);
        
        transaction_successful := true;
    ELSE
        RAISE EXCEPTION 'Insufficient coins. Current balance: %, Required: %', user_balance, p_amount;
    END IF;
    
    RETURN transaction_successful;
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to spend coins: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 