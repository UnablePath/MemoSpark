-- Migration: Add User Search and Recommendations Functions
-- Description: Functions needed for the student discovery and swipe interface

-- Function to search users by name, email, or subjects
CREATE OR REPLACE FUNCTION search_users(search_term TEXT)
RETURNS TABLE (
    clerk_user_id TEXT,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    year_of_study TEXT,
    subjects TEXT[],
    interests TEXT[]
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        p.clerk_user_id,
        p.full_name,
        p.email,
        p.avatar_url,
        p.year_of_study,
        p.subjects,
        p.interests
    FROM profiles p
    WHERE 
        p.onboarding_completed = true
        AND (
            p.full_name ILIKE '%' || search_term || '%'
            OR p.email ILIKE '%' || search_term || '%'
            OR EXISTS (
                SELECT 1 FROM unnest(p.subjects) AS subject
                WHERE subject ILIKE '%' || search_term || '%'
            )
            OR EXISTS (
                SELECT 1 FROM unnest(p.interests) AS interest
                WHERE interest ILIKE '%' || search_term || '%'
            )
        )
    ORDER BY 
        CASE 
            WHEN p.full_name ILIKE search_term || '%' THEN 1
            WHEN p.full_name ILIKE '%' || search_term || '%' THEN 2
            ELSE 3
        END,
        p.full_name
    LIMIT 50;
$$;

-- Function to get user recommendations for swipe interface
CREATE OR REPLACE FUNCTION get_user_recommendations(user_id_input TEXT)
RETURNS TABLE (
    clerk_user_id TEXT,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    year_of_study TEXT,
    subjects TEXT[],
    interests TEXT[],
    similarity_score DECIMAL
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    WITH user_profile AS (
        SELECT subjects, interests, year_of_study
        FROM profiles
        WHERE clerk_user_id = user_id_input
    ),
    existing_connections AS (
        SELECT 
            CASE 
                WHEN requester_id = user_id_input THEN receiver_id
                ELSE requester_id
            END AS connected_user_id
        FROM connections
        WHERE (requester_id = user_id_input OR receiver_id = user_id_input)
        AND status IN ('accepted', 'pending')
    )
    SELECT 
        p.clerk_user_id,
        p.full_name,
        p.email,
        p.avatar_url,
        p.year_of_study,
        p.subjects,
        p.interests,
        (
            -- Calculate similarity based on common subjects and interests
            COALESCE(
                (
                    SELECT COUNT(*)::DECIMAL / GREATEST(
                        array_length(p.subjects, 1), 
                        array_length(up.subjects, 1), 
                        1
                    )
                    FROM user_profile up
                    WHERE p.subjects && up.subjects
                ), 0
            ) +
            COALESCE(
                (
                    SELECT COUNT(*)::DECIMAL / GREATEST(
                        array_length(p.interests, 1), 
                        array_length(up.interests, 1), 
                        1
                    )
                    FROM user_profile up
                    WHERE p.interests && up.interests
                ), 0
            ) +
            CASE 
                WHEN p.year_of_study = (SELECT year_of_study FROM user_profile) THEN 0.3
                ELSE 0
            END
        ) AS similarity_score
    FROM profiles p
    CROSS JOIN user_profile up
    WHERE 
        p.clerk_user_id != user_id_input
        AND p.onboarding_completed = true
        AND p.clerk_user_id NOT IN (SELECT connected_user_id FROM existing_connections)
    ORDER BY similarity_score DESC, RANDOM()
    LIMIT 20;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_users(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_recommendations(TEXT) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION search_users IS 'Search users by name, email, subjects, or interests';
COMMENT ON FUNCTION get_user_recommendations IS 'Get user recommendations for swipe interface based on similarity'; 