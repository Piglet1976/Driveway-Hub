#!/bin/bash

# Fix Tesla OAuth Redirect URI Script
# This script rebuilds and restarts the backend with corrected environment variables

echo "========================================="
echo "Fixing Tesla OAuth Redirect URI"
echo "========================================="

# Step 1: Show current environment setup
echo "Step 1: Checking environment configuration..."
echo "TESLA_OAUTH_REDIRECT_URI should be: https://161.35.176.111/api/auth/tesla/callback"
echo ""

if grep -q "TESLA_OAUTH_REDIRECT_URI=https://161.35.176.111/api/auth/tesla/callback" .env.production; then
    echo "✅ .env.production has correct redirect URI"
else
    echo "❌ .env.production needs updating"
    echo "Current setting:"
    grep "TESLA_OAUTH_REDIRECT_URI" .env.production || echo "Not found"
    exit 1
fi

# Step 2: Check Docker Compose configuration
echo ""
echo "Step 2: Verifying Docker Compose passes environment variables..."
if grep -q "TESLA_OAUTH_REDIRECT_URI: \${TESLA_OAUTH_REDIRECT_URI}" docker-compose.production.yml; then
    echo "✅ Docker Compose is configured to pass TESLA_OAUTH_REDIRECT_URI"
else
    echo "❌ Docker Compose configuration issue"
    exit 1
fi

# Step 3: Rebuild and restart backend service
echo ""
echo "Step 3: Rebuilding and restarting backend service..."

# Use the correct compose command
if [ -f "docker-compose.production.yml" ]; then
    echo "Stopping backend service..."
    docker-compose -f docker-compose.production.yml stop app
    
    echo "Rebuilding backend service..."
    docker-compose -f docker-compose.production.yml build app
    
    echo "Starting backend service..."
    docker-compose -f docker-compose.production.yml up -d app
    
    echo "✅ Backend service restarted"
else
    echo "❌ docker-compose.production.yml not found"
    exit 1
fi

# Step 4: Wait for service to be ready
echo ""
echo "Step 4: Waiting for service to be ready..."
sleep 15

# Step 5: Test the endpoint
echo ""
echo "Step 5: Testing Tesla OAuth endpoint..."

# Get auth token
echo "Getting authentication token..."
LOGIN_RESPONSE=$(curl -s -X POST https://161.35.176.111/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"driver@test.com"}' \
  --insecure)

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get authentication token"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo "✅ Got authentication token"

# Test Tesla auth endpoint
echo "Testing Tesla auth endpoint..."
AUTH_RESPONSE=$(curl -s -X GET https://161.35.176.111/api/auth/tesla \
  -H "Authorization: Bearer $TOKEN" \
  --insecure)

echo "Tesla Auth Response:"
echo "$AUTH_RESPONSE"
echo ""

# Check if redirect_uri is properly set
if echo "$AUTH_RESPONSE" | grep -q "redirect_uri=https://161.35.176.111/api/auth/tesla/callback"; then
    echo "✅ SUCCESS: redirect_uri is now correctly set!"
    echo ""
    echo "Your Tesla OAuth URL now includes:"
    echo "redirect_uri=https://161.35.176.111/api/auth/tesla/callback"
else
    echo "❌ ISSUE: redirect_uri is still not set correctly"
    echo ""
    echo "Checking environment variables inside container..."
    docker exec $(docker-compose -f docker-compose.production.yml ps -q app) env | grep TESLA
fi

echo ""
echo "========================================="
echo "Tesla OAuth Redirect Fix Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Update Tesla Developer Portal with this redirect URL:"
echo "   https://161.35.176.111/api/auth/tesla/callback"
echo ""
echo "2. Test the OAuth flow with your Tesla account"