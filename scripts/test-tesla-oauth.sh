#!/bin/bash

# Tesla OAuth Flow Test Script
# Tests the complete OAuth flow from authorization to callback

set -e

echo "======================================"
echo "Tesla OAuth Flow Test Script"
echo "======================================"
echo ""

# Configuration
API_URL="https://161.35.176.111/api"
EMAIL="driver@test.com"  # Update with your test user email

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "1. Testing API health..."
echo "-------------------------"
HEALTH=$(curl -s -X GET "$API_URL/health")
echo "Health check response: $HEALTH"
echo ""

echo "2. Logging in to get JWT token..."
echo "----------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
    echo -e "${RED}✗ Failed to get JWT token${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Got JWT token${NC}"
echo "Token (first 20 chars): ${TOKEN:0:20}..."
echo ""

echo "3. Testing Tesla OAuth URL generation..."
echo "-----------------------------------------"
TESLA_AUTH_RESPONSE=$(curl -s -X GET "$API_URL/auth/tesla" \
  -H "Authorization: Bearer $TOKEN")

AUTH_URL=$(echo $TESLA_AUTH_RESPONSE | grep -o '"auth_url":"[^"]*' | sed 's/"auth_url":"//')

if [ -z "$AUTH_URL" ]; then
    echo -e "${RED}✗ Failed to generate Tesla authorization URL${NC}"
    echo "Response: $TESLA_AUTH_RESPONSE"
    echo ""
    echo "Possible issues:"
    echo "1. TESLA_CLIENT_SECRET not set in environment"
    echo "2. TESLA_CLIENT_ID is invalid"
    echo "3. Tesla service initialization failed"
    exit 1
fi

echo -e "${GREEN}✓ Tesla authorization URL generated successfully!${NC}"
echo ""
echo "Authorization URL:"
echo "$AUTH_URL"
echo ""

# Parse the URL to verify parameters
echo "4. Verifying OAuth parameters..."
echo "---------------------------------"
if echo "$AUTH_URL" | grep -q "client_id="; then
    echo -e "${GREEN}✓ client_id present${NC}"
else
    echo -e "${RED}✗ client_id missing${NC}"
fi

if echo "$AUTH_URL" | grep -q "redirect_uri="; then
    REDIRECT_URI=$(echo "$AUTH_URL" | grep -o 'redirect_uri=[^&]*' | sed 's/redirect_uri=//')
    DECODED_URI=$(echo "$REDIRECT_URI" | sed 's/%3A/:/g' | sed 's/%2F/\//g')
    echo -e "${GREEN}✓ redirect_uri present: $DECODED_URI${NC}"
else
    echo -e "${RED}✗ redirect_uri missing${NC}"
fi

if echo "$AUTH_URL" | grep -q "response_type=code"; then
    echo -e "${GREEN}✓ response_type=code present${NC}"
else
    echo -e "${RED}✗ response_type missing${NC}"
fi

if echo "$AUTH_URL" | grep -q "scope="; then
    echo -e "${GREEN}✓ scope present${NC}"
else
    echo -e "${RED}✗ scope missing${NC}"
fi

if echo "$AUTH_URL" | grep -q "state="; then
    echo -e "${GREEN}✓ state present${NC}"
else
    echo -e "${RED}✗ state missing${NC}"
fi

if echo "$AUTH_URL" | grep -q "code_challenge="; then
    echo -e "${GREEN}✓ PKCE code_challenge present${NC}"
else
    echo -e "${RED}✗ PKCE code_challenge missing${NC}"
fi

echo ""
echo "5. Testing Tesla connection status..."
echo "--------------------------------------"
STATUS_RESPONSE=$(curl -s -X GET "$API_URL/tesla/status" \
  -H "Authorization: Bearer $TOKEN")

echo "Tesla connection status: $STATUS_RESPONSE"
echo ""

echo "======================================"
echo "TEST COMPLETE"
echo "======================================"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "1. Click the authorization URL above to authenticate with Tesla"
echo "2. After authorization, you'll be redirected to the callback URL"
echo "3. The frontend should handle the callback and complete the OAuth flow"
echo ""
echo "To manually test the callback (after getting the code from Tesla):"
echo "curl -X POST \"$API_URL/auth/tesla/callback\" \\"
echo "  -H \"Authorization: Bearer $TOKEN\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"code\":\"YOUR_AUTH_CODE\",\"state\":\"YOUR_STATE\"}'"
echo ""