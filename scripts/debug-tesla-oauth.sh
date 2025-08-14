#!/bin/bash

# Tesla OAuth Debug Script for Production
# Run this on your production server to diagnose and fix Tesla OAuth issues

set -e

echo "======================================"
echo "Tesla OAuth Debug & Fix Script"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to app directory
cd /opt/driveway-hub

echo "1. Checking Docker containers status..."
echo "----------------------------------------"
docker-compose -f docker-compose.yml -f docker-compose.production.yml ps
echo ""

echo "2. Checking app container logs for Tesla errors..."
echo "---------------------------------------------------"
docker-compose -f docker-compose.yml -f docker-compose.production.yml logs app | grep -i tesla | tail -20
echo ""

echo "3. Verifying Tesla environment variables in container..."
echo "---------------------------------------------------------"
docker-compose -f docker-compose.yml -f docker-compose.production.yml exec app sh -c 'echo "TESLA_CLIENT_ID: ${TESLA_CLIENT_ID:0:10}..." && echo "TESLA_CLIENT_SECRET: ${TESLA_CLIENT_SECRET:+SET}" && echo "TESLA_OAUTH_REDIRECT_URI: $TESLA_OAUTH_REDIRECT_URI" && echo "TESLA_OAUTH_SCOPE: $TESLA_OAUTH_SCOPE"'
echo ""

echo "4. Checking current .env file being used..."
echo "--------------------------------------------"
if [ -f ".env.production.local" ]; then
    echo -e "${GREEN}✓ Found .env.production.local${NC}"
    echo "Checking Tesla configuration:"
    grep "^TESLA_" .env.production.local | sed 's/\(TESLA_CLIENT_SECRET=\).*/\1[HIDDEN]/'
elif [ -f ".env.production" ]; then
    echo -e "${YELLOW}⚠ Using .env.production (no .env.production.local found)${NC}"
    echo "Checking Tesla configuration:"
    grep "^TESLA_" .env.production | sed 's/\(TESLA_CLIENT_SECRET=\).*/\1[HIDDEN]/'
else
    echo -e "${RED}✗ No production environment file found!${NC}"
fi
echo ""

echo "5. Testing Tesla service initialization..."
echo "-------------------------------------------"
docker-compose -f docker-compose.yml -f docker-compose.production.yml exec app node -e "
const { TeslaService } = require('./dist/services/tesla.service.js');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'driveway_hub_prod',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

const teslaService = new TeslaService(pool);
console.log('Tesla Service initialized');
console.log('Client ID present:', !!teslaService.clientId);
console.log('Client Secret present:', !!teslaService.clientSecret);
console.log('Redirect URI:', teslaService.redirectUri);
console.log('Scope:', teslaService.scope);

// Try to generate auth URL
try {
  const authUrl = teslaService.generateAuthUrl('test-user-123').then(url => {
    console.log('✓ Auth URL generated successfully');
    console.log('URL:', url.substring(0, 100) + '...');
  }).catch(err => {
    console.error('✗ Failed to generate auth URL:', err.message);
  });
} catch (err) {
  console.error('✗ Error:', err.message);
}
" 2>&1 || echo -e "${RED}Failed to test Tesla service${NC}"
echo ""

echo "6. Testing Tesla OAuth endpoint..."
echo "-----------------------------------"
# Get a test token (you'll need to replace this with a real token for testing)
echo "Testing /api/auth/tesla endpoint (requires valid JWT token)..."
curl -s -X GET https://161.35.176.111/api/health | jq '.' || echo "Health check failed"
echo ""

echo "======================================"
echo "DIAGNOSIS COMPLETE"
echo "======================================"
echo ""
echo -e "${YELLOW}Common Issues & Solutions:${NC}"
echo ""
echo "1. ${RED}TESLA_CLIENT_SECRET not set:${NC}"
echo "   - Edit your environment file: nano .env.production.local"
echo "   - Add your Tesla client secret from Tesla Developer Portal"
echo "   - Restart containers: docker-compose -f docker-compose.yml -f docker-compose.production.yml restart app"
echo ""
echo "2. ${RED}Wrong environment file loaded:${NC}"
echo "   - Create .env.production.local if it doesn't exist:"
echo "     cp .env.production .env.production.local"
echo "   - Update with your actual credentials"
echo "   - Restart with: docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production.local restart"
echo ""
echo "3. ${RED}Container not picking up env changes:${NC}"
echo "   - Stop containers: docker-compose -f docker-compose.yml -f docker-compose.production.yml down"
echo "   - Start with new env: docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production.local up -d"
echo ""
echo "4. ${RED}Tesla API credentials invalid:${NC}"
echo "   - Verify credentials at: https://developer.tesla.com"
echo "   - Check redirect URI matches exactly: https://161.35.176.111/api/auth/tesla/callback"
echo ""

echo "======================================"
echo "QUICK FIX COMMANDS"
echo "======================================"
echo ""
echo "# 1. Create/edit production environment file:"
echo "nano .env.production.local"
echo ""
echo "# 2. Add these lines (replace with your actual values):"
echo "TESLA_CLIENT_ID=d20a2b52-df7d-495f-b6e5-97c496f1d4d0"
echo "TESLA_CLIENT_SECRET=YOUR_ACTUAL_SECRET_HERE"
echo "TESLA_OAUTH_REDIRECT_URI=https://161.35.176.111/api/auth/tesla/callback"
echo ""
echo "# 3. Restart the application:"
echo "docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production.local restart app"
echo ""
echo "# 4. Check logs:"
echo "docker-compose -f docker-compose.yml -f docker-compose.production.yml logs -f app"
echo ""