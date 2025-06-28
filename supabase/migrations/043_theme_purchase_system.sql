-- Migration: Theme Purchase System
-- Description: Add theme purchase tracking and theme items to coin shop

-- Enable UUID extension (should already be enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table for tracking user theme purchases
CREATE TABLE user_purchased_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL, -- Use TEXT to match clerk user ID format
  theme_id TEXT NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  price_paid INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}', -- Store theme details, colors, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure each user can only purchase each theme once
  UNIQUE(clerk_user_id, theme_id)
);

COMMENT ON TABLE "user_purchased_themes" IS 'Tracks theme purchases by users with coin economy integration.';

-- Index for performance
CREATE INDEX idx_user_purchased_themes_user_id ON user_purchased_themes(clerk_user_id);
CREATE INDEX idx_user_purchased_themes_theme_id ON user_purchased_themes(theme_id);
CREATE INDEX idx_user_purchased_themes_purchased_at ON user_purchased_themes(purchased_at DESC);

-- Add theme items to existing coin_spending_categories table
INSERT INTO coin_spending_categories (category_name, item_name, cost, description, requirements, metadata) VALUES
-- Basic themes (accessible to all users)
('customization', 'Forest Dream Theme', 50, 'Serene greens for focused studying and deep concentration', '{}', '{"type": "theme", "theme_id": "forest-dream", "rarity": "common", "colors": {"primary": "#10B981", "secondary": "#047857", "accent": "#34D399"}}'),

('customization', 'Sunset Blaze Theme', 75, 'Warm energy for productive sessions and motivation', '{}', '{"type": "theme", "theme_id": "sunset-blaze", "rarity": "common", "colors": {"primary": "#F59E0B", "secondary": "#D97706", "accent": "#FBBF24"}}'),

-- Intermediate themes (require some progress)
('customization', 'Ocean Depths Theme', 120, 'Deep blues that inspire focus and tranquility', '{"tasks_completed": 10}', '{"type": "theme", "theme_id": "ocean-depths", "rarity": "rare", "colors": {"primary": "#0EA5E9", "secondary": "#0284C7", "accent": "#38BDF8"}}'),

('customization', 'Purple Haze Theme', 150, 'Mystical purples for creativity and inspiration', '{"tasks_completed": 15}', '{"type": "theme", "theme_id": "purple-haze", "rarity": "rare", "colors": {"primary": "#8B5CF6", "secondary": "#7C3AED", "accent": "#A78BFA"}}'),

-- Advanced themes (require significant progress)
('customization', 'Cherry Blossom Theme', 200, 'Soft pinks that bring zen and tranquility to your studies', '{"tasks_completed": 20, "current_streak": 3}', '{"type": "theme", "theme_id": "cherry-blossom", "rarity": "epic", "colors": {"primary": "#EC4899", "secondary": "#DB2777", "accent": "#F472B6"}}'),

-- Premium/Legendary themes (highest tier)
('customization', 'Golden Hour Theme', 300, 'Luxurious golds for dedicated students who have earned their stripes', '{"tasks_completed": 25, "current_streak": 5}', '{"type": "theme", "theme_id": "golden-hour", "rarity": "legendary", "colors": {"primary": "#F59E0B", "secondary": "#D97706", "accent": "#FCD34D"}}')

ON CONFLICT (category_name, item_name) DO NOTHING;

-- Function to check if user owns a theme
CREATE OR REPLACE FUNCTION user_owns_theme(
    p_clerk_user_id TEXT,
    p_theme_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    theme_owned BOOLEAN := false;
BEGIN
    -- Check if user has purchased this theme
    SELECT EXISTS (
        SELECT 1 
        FROM user_purchased_themes 
        WHERE clerk_user_id = p_clerk_user_id 
        AND theme_id = p_theme_id
    ) INTO theme_owned;
    
    -- Default theme is always owned
    IF p_theme_id = 'default' OR p_theme_id = 'light' OR p_theme_id = 'dark' THEN
        theme_owned := true;
    END IF;
    
    RETURN theme_owned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's purchased themes
CREATE OR REPLACE FUNCTION get_user_purchased_themes(
    p_clerk_user_id TEXT
)
RETURNS TABLE (
    theme_id TEXT,
    purchased_at TIMESTAMPTZ,
    price_paid INTEGER,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        upt.theme_id,
        upt.purchased_at,
        upt.price_paid,
        upt.metadata
    FROM user_purchased_themes upt
    WHERE upt.clerk_user_id = p_clerk_user_id
    ORDER BY upt.purchased_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security
ALTER TABLE user_purchased_themes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_purchased_themes
CREATE POLICY "Users can view their own purchased themes" ON user_purchased_themes
    FOR SELECT USING (true); -- Allow reading for now, can be restricted later

CREATE POLICY "System can insert theme purchases" ON user_purchased_themes
    FOR INSERT WITH CHECK (true); -- Allow insertions from the application

CREATE POLICY "Users cannot update or delete theme purchases" ON user_purchased_themes
    FOR UPDATE USING (false);

CREATE POLICY "Users cannot delete theme purchases" ON user_purchased_themes
    FOR DELETE USING (false);

-- Grant necessary permissions
GRANT SELECT ON user_purchased_themes TO authenticated;
GRANT INSERT ON user_purchased_themes TO authenticated;
GRANT USAGE ON SEQUENCE user_purchased_themes_id_seq TO authenticated; 