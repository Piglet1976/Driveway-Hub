#!/bin/bash

# Tesla Integration Setup Script
# This script sets up the Tesla OAuth integration

echo "========================================="
echo "Tesla OAuth Integration Setup"
echo "========================================="

# Check if running with proper permissions
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  Running as root - be careful with file permissions"
fi

# Step 1: Create necessary directories
echo "Step 1: Creating directories..."
mkdir -p scripts
mkdir -p database
mkdir -p src/services
echo "✅ Directories created"

# Step 2: Apply database migration
echo ""
echo "Step 2: Applying database migration..."

# Try Docker method first
if docker ps | grep -q "postgres"; then
    echo "Applying migration via Docker..."
    docker exec -i $(docker ps --format "table {{.Names}}" | grep postgres | head -1) psql -U postgres -d driveway_hub_prod << 'EOF'
-- Tesla OAuth Enhancement Migration
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS tesla_code_verifier VARCHAR(255),
ADD COLUMN IF NOT EXISTS tesla_token_scope TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_tesla_token_expires ON users(tesla_token_expires_at) WHERE tesla_access_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_tesla_id ON vehicles(tesla_vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);

-- Function to clean expired tokens
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

-- View for connection status
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

SELECT 'Migration completed successfully!' as status;
EOF

    if [ $? -eq 0 ]; then
        echo "✅ Database migration completed successfully"
    else
        echo "❌ Database migration failed"
        exit 1
    fi
else
    echo "⚠️  PostgreSQL container not found. Run this manually:"
    echo "   psql -h 161.35.176.111 -U postgres -d driveway_hub_prod < database/tesla-oauth-migration.sql"
fi

# Step 3: Build and restart services
echo ""
echo "Step 3: Building and restarting services..."

if [ -f "docker-compose.production.yml" ]; then
    echo "Building backend service..."
    docker-compose -f docker-compose.production.yml build backend
    
    echo "Restarting backend service..."
    docker-compose -f docker-compose.production.yml up -d backend
    
    echo "✅ Services restarted"
    
    # Wait for service to be ready
    echo "Waiting for service to be ready..."
    sleep 10
    
    # Test health endpoint
    if curl -s --insecure https://161.35.176.111/api/health | grep -q "ok"; then
        echo "✅ Backend service is healthy"
    else
        echo "⚠️  Backend service health check failed"
    fi
else
    echo "⚠️  docker-compose.production.yml not found. Restart services manually."
fi

# Step 4: Check Tesla environment variables
echo ""
echo "Step 4: Checking Tesla environment configuration..."

ENV_ISSUES=0

if [ -z "$TESLA_CLIENT_ID" ]; then
    echo "❌ TESLA_CLIENT_ID not set"
    ENV_ISSUES=$((ENV_ISSUES + 1))
else
    echo "✅ TESLA_CLIENT_ID is set"
fi

if [ -z "$TESLA_CLIENT_SECRET" ]; then
    echo "❌ TESLA_CLIENT_SECRET not set"
    ENV_ISSUES=$((ENV_ISSUES + 1))
else
    echo "✅ TESLA_CLIENT_SECRET is set"
fi

if [ -z "$TESLA_OAUTH_REDIRECT_URI" ]; then
    echo "❌ TESLA_OAUTH_REDIRECT_URI not set"
    ENV_ISSUES=$((ENV_ISSUES + 1))
else
    echo "✅ TESLA_OAUTH_REDIRECT_URI is set"
fi

if [ $ENV_ISSUES -gt 0 ]; then
    echo ""
    echo "⚠️  Environment variable issues found!"
    echo "   Update your .env.production file with Tesla credentials"
    echo "   See TESLA-INTEGRATION-GUIDE.md for details"
fi

# Step 5: Test API endpoints
echo ""
echo "Step 5: Testing API endpoints..."

# Test login
LOGIN_TEST=$(curl -s --insecure -X POST https://161.35.176.111/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"driver@test.com"}')

if echo "$LOGIN_TEST" | grep -q "token"; then
    echo "✅ Login endpoint working"
    
    TOKEN=$(echo $LOGIN_TEST | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    # Test Tesla status endpoint
    STATUS_TEST=$(curl -s --insecure -X GET https://161.35.176.111/api/tesla/status \
        -H "Authorization: Bearer $TOKEN")
    
    if echo "$STATUS_TEST" | grep -q "connected"; then
        echo "✅ Tesla status endpoint working"
    else
        echo "❌ Tesla status endpoint failed"
    fi
    
    # Test Tesla auth endpoint
    AUTH_TEST=$(curl -s --insecure -X GET https://161.35.176.111/api/auth/tesla \
        -H "Authorization: Bearer $TOKEN")
    
    if echo "$AUTH_TEST" | grep -q "auth_url"; then
        echo "✅ Tesla auth endpoint working"
    else
        echo "❌ Tesla auth endpoint failed"
        echo "Response: $AUTH_TEST"
    fi
else
    echo "❌ Login endpoint failed"
    echo "Response: $LOGIN_TEST"
fi

echo ""
echo "========================================="
echo "Setup Summary:"
echo "========================================="

if [ $ENV_ISSUES -eq 0 ]; then
    echo "✅ Environment variables configured"
else
    echo "⚠️  Environment variables need attention"
fi

echo ""
echo "Next Steps:"
echo "1. Update Tesla Developer Portal with redirect URL:"
echo "   https://161.35.176.111/api/auth/tesla/callback"
echo ""
echo "2. Test the integration:"
echo "   ./scripts/test-tesla-integration.sh"
echo ""
echo "3. Check the integration guide:"
echo "   cat TESLA-INTEGRATION-GUIDE.md"
echo ""
echo "Setup complete! 🚗⚡"