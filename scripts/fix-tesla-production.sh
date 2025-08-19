#!/bin/bash

# Tesla OAuth Production Fix Script
# This script fixes the Tesla OAuth configuration on your production server

set -e

echo "======================================"
echo "Tesla OAuth Production Fix Script"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if running on production server
if [ ! -d "/opt/driveway-hub" ]; then
    echo -e "${RED}Error: This script must be run on the production server${NC}"
    echo "Please SSH into your server first:"
    echo "ssh root@161.35.176.111"
    exit 1
fi

cd /opt/driveway-hub

echo -e "${BLUE}Step 1: Checking current environment setup...${NC}"
echo "----------------------------------------------"

# Check which env file exists
ENV_FILE=""
if [ -f ".env.production.local" ]; then
    ENV_FILE=".env.production.local"
    echo -e "${GREEN}✓ Found .env.production.local${NC}"
elif [ -f ".env.production" ]; then
    ENV_FILE=".env.production"
    echo -e "${YELLOW}⚠ Found .env.production (will create .env.production.local)${NC}"
else
    echo -e "${RED}✗ No production environment file found!${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Creating backup of current configuration...${NC}"
echo "----------------------------------------------------"
cp $ENV_FILE "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo -e "${GREEN}✓ Backup created${NC}"

echo ""
echo -e "${BLUE}Step 3: Checking Tesla configuration...${NC}"
echo "----------------------------------------"

# Check current Tesla config
CLIENT_ID=$(grep "^TESLA_CLIENT_ID=" $ENV_FILE | cut -d'=' -f2)
CLIENT_SECRET=$(grep "^TESLA_CLIENT_SECRET=" $ENV_FILE | cut -d'=' -f2)
REDIRECT_URI=$(grep "^TESLA_OAUTH_REDIRECT_URI=" $ENV_FILE | cut -d'=' -f2)

echo "Current configuration:"
echo "  CLIENT_ID: ${CLIENT_ID:-NOT SET}"
echo "  CLIENT_SECRET: ${CLIENT_SECRET:+SET (hidden)}"
echo "  REDIRECT_URI: ${REDIRECT_URI:-NOT SET}"

# Check if CLIENT_SECRET needs to be set
if [ -z "$CLIENT_SECRET" ] || [ "$CLIENT_SECRET" == "REPLACE_WITH_YOUR_TESLA_CLIENT_SECRET" ] || [ "$CLIENT_SECRET" == "YOUR_TESLA_CLIENT_SECRET_HERE" ]; then
    echo ""
    echo -e "${YELLOW}Tesla Client Secret is not properly configured!${NC}"
    echo ""
    echo "You need to get your Tesla Client Secret from:"
    echo "https://developer.tesla.com"
    echo ""
    read -p "Enter your Tesla Client Secret: " NEW_CLIENT_SECRET
    
    if [ -z "$NEW_CLIENT_SECRET" ]; then
        echo -e "${RED}Error: Client Secret cannot be empty${NC}"
        exit 1
    fi
    
    # Create or update .env.production.local
    if [ "$ENV_FILE" == ".env.production" ]; then
        echo ""
        echo -e "${BLUE}Creating .env.production.local...${NC}"
        cp .env.production .env.production.local
        ENV_FILE=".env.production.local"
    fi
    
    # Update the CLIENT_SECRET
    sed -i "s/^TESLA_CLIENT_SECRET=.*/TESLA_CLIENT_SECRET=$NEW_CLIENT_SECRET/" $ENV_FILE
    echo -e "${GREEN}✓ Tesla Client Secret updated${NC}"
else
    echo -e "${GREEN}✓ Tesla Client Secret is already configured${NC}"
fi

echo ""
echo -e "${BLUE}Step 4: Verifying all Tesla environment variables...${NC}"
echo "-----------------------------------------------------"

# Ensure all required Tesla vars are set
if ! grep -q "^TESLA_CLIENT_ID=" $ENV_FILE; then
    echo "TESLA_CLIENT_ID=d20a2b52-df7d-495f-b6e5-97c496f1d4d0" >> $ENV_FILE
    echo "Added TESLA_CLIENT_ID"
fi

if ! grep -q "^TESLA_OAUTH_REDIRECT_URI=" $ENV_FILE; then
    echo "TESLA_OAUTH_REDIRECT_URI=https://161.35.176.111/api/auth/tesla/callback" >> $ENV_FILE
    echo "Added TESLA_OAUTH_REDIRECT_URI"
fi

if ! grep -q "^TESLA_SUCCESS_URL=" $ENV_FILE; then
    echo "TESLA_SUCCESS_URL=https://161.35.176.111/dashboard" >> $ENV_FILE
    echo "Added TESLA_SUCCESS_URL"
fi

if ! grep -q "^TESLA_OAUTH_SCOPE=" $ENV_FILE; then
    echo "TESLA_OAUTH_SCOPE=openid offline_access user_data vehicle_device_data vehicle_cmds vehicle_charging_cmds" >> $ENV_FILE
    echo "Added TESLA_OAUTH_SCOPE"
fi

echo -e "${GREEN}✓ All Tesla environment variables verified${NC}"

echo ""
echo -e "${BLUE}Step 5: Rebuilding and restarting application...${NC}"
echo "-------------------------------------------------"

# Stop current containers
echo "Stopping current containers..."
docker compose -f docker compose.yml -f docker compose.production.yml down

# Rebuild the app with new TypeScript changes
echo "Rebuilding application with improved error handling..."
docker compose -f docker compose.yml -f docker compose.production.yml --env-file $ENV_FILE build app

# Start containers with the correct env file
echo "Starting containers with updated configuration..."
docker compose -f docker compose.yml -f docker compose.production.yml --env-file $ENV_FILE up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

echo ""
echo -e "${BLUE}Step 6: Verifying Tesla service initialization...${NC}"
echo "--------------------------------------------------"

# Check logs for Tesla initialization
echo "Checking app logs for Tesla service status..."
docker compose -f docker compose.yml -f docker compose.production.yml logs app | grep -i "Tesla Service initialized" | tail -1

echo ""
echo -e "${BLUE}Step 7: Testing Tesla OAuth endpoint...${NC}"
echo "----------------------------------------"

# Test the health endpoint first
HEALTH_RESPONSE=$(curl -s https://161.35.176.111/api/health)
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo -e "${GREEN}✓ API is responding${NC}"
else
    echo -e "${RED}✗ API health check failed${NC}"
fi

echo ""
echo "======================================"
echo -e "${GREEN}FIX COMPLETE!${NC}"
echo "======================================"
echo ""
echo "Your Tesla OAuth should now be working. To verify:"
echo ""
echo "1. Check the logs:"
echo "   docker compose -f docker compose.yml -f docker compose.production.yml logs -f app"
echo ""
echo "2. Run the test script:"
echo "   ./scripts/test-tesla-oauth.sh"
echo ""
echo "3. Visit your app and try connecting Tesla:"
echo "   https://161.35.176.111"
echo ""
echo "If you still have issues, check:"
echo "- Your Tesla Client Secret is correct"
echo "- Your app is registered at https://developer.tesla.com"
echo "- The redirect URI matches exactly: https://161.35.176.111/api/auth/tesla/callback"
echo ""