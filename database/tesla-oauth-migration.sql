-- Tesla OAuth Enhancement Migration
-- Adds fields needed for PKCE flow and token management

-- Add fields to users table for Tesla OAuth PKCE flow
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS tesla_code_verifier VARCHAR(255),
ADD COLUMN IF NOT EXISTS tesla_token_scope TEXT;

-- Update vehicles table to ensure proper Tesla integration
ALTER TABLE vehicles
ALTER COLUMN tesla_vehicle_id TYPE BIGINT USING tesla_vehicle_id::BIGINT;

-- Create index for faster Tesla lookups
CREATE INDEX IF NOT EXISTS idx_users_tesla_token_expires ON users(tesla_token_expires_at) WHERE tesla_access_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_tesla_id ON vehicles(tesla_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);

-- Function to clean expired Tesla tokens (optional, for maintenance)
CREATE OR REPLACE FUNCTION clean_expired_tesla_tokens()
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET tesla_access_token = NULL,
        tesla_refresh_token = NULL,
        tesla_code_verifier = NULL
    WHERE tesla_token_expires_at < NOW() - INTERVAL '30 days'
    AND tesla_access_token IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- View for Tesla connection status
CREATE OR REPLACE VIEW tesla_connections AS
SELECT 
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    CASE 
        WHEN u.tesla_access_token IS NOT NULL THEN true 
        ELSE false 
    END as is_connected,
    CASE 
        WHEN u.tesla_token_expires_at > NOW() THEN true 
        ELSE false 
    END as token_valid,
    u.tesla_token_expires_at,
    COUNT(v.id) as vehicle_count
FROM users u
LEFT JOIN vehicles v ON u.id = v.user_id AND v.is_active = true
GROUP BY u.id, u.email, u.first_name, u.last_name, u.tesla_access_token, u.tesla_token_expires_at;

-- Grant permissions if needed
GRANT SELECT ON tesla_connections TO PUBLIC;

COMMENT ON COLUMN users.tesla_code_verifier IS 'PKCE code verifier for Tesla OAuth flow';
COMMENT ON COLUMN users.tesla_token_scope IS 'OAuth scopes granted by Tesla';
COMMENT ON VIEW tesla_connections IS 'View showing Tesla connection status for all users';