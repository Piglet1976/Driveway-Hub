#!/bin/bash

# Tesla OAuth Integration Test Script
# Usage: ./test-tesla-integration.sh

SERVER_URL="https://161.35.176.111"
EMAIL="driver@test.com"

echo "========================================="
echo "Tesla OAuth Integration Test"
echo "========================================="
echo ""

# Step 1: Login
echo "Step 1: Logging in as $EMAIL..."
LOGIN_RESPONSE=$(curl -s -X POST $SERVER_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}" \
  --insecure)

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get authentication token"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo "✅ Got authentication token"
echo ""

# Step 2: Check Tesla connection status
echo "Step 2: Checking Tesla connection status..."
STATUS_RESPONSE=$(curl -s -X GET $SERVER_URL/api/tesla/status \
  -H "Authorization: Bearer $TOKEN" \
  --insecure)

echo "Tesla Status: $STATUS_RESPONSE"
echo ""

# Step 3: Get Tesla OAuth URL
echo "Step 3: Getting Tesla OAuth URL..."
AUTH_RESPONSE=$(curl -s -X GET $SERVER_URL/api/auth/tesla \
  -H "Authorization: Bearer $TOKEN" \
  --insecure)

AUTH_URL=$(echo $AUTH_RESPONSE | grep -o '"auth_url":"[^"]*' | cut -d'"' -f4)

if [ -z "$AUTH_URL" ]; then
    echo "❌ Failed to get Tesla auth URL"
    echo "Response: $AUTH_RESPONSE"
    exit 1
fi

echo "✅ Got Tesla auth URL:"
echo "$AUTH_URL"
echo ""
echo "========================================="
echo "MANUAL STEP REQUIRED:"
echo "1. Open this URL in your browser:"
echo "   $AUTH_URL"
echo "2. Log in with your Tesla account"
echo "3. Authorize the application"
echo "4. Copy the 'code' and 'state' from the redirect URL"
echo "========================================="
echo ""

# Step 4: Submit OAuth callback
read -p "Enter the authorization code from Tesla: " AUTH_CODE
read -p "Enter the state parameter from URL: " STATE

if [ ! -z "$AUTH_CODE" ] && [ ! -z "$STATE" ]; then
    echo ""
    echo "Step 4: Submitting OAuth callback..."
    CALLBACK_RESPONSE=$(curl -s -X POST $SERVER_URL/api/auth/tesla/callback \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"code\":\"$AUTH_CODE\",\"state\":\"$STATE\"}" \
      --insecure)
    
    echo "Callback Response: $CALLBACK_RESPONSE"
    echo ""
    
    # Check if successful
    if echo "$CALLBACK_RESPONSE" | grep -q "success.*true"; then
        echo "✅ Tesla account connected successfully!"
        echo ""
        
        # Step 5: Fetch vehicles
        echo "Step 5: Fetching Tesla vehicles..."
        VEHICLES_RESPONSE=$(curl -s -X GET $SERVER_URL/api/tesla/vehicles \
          -H "Authorization: Bearer $TOKEN" \
          --insecure)
        
        echo "Vehicles Response:"
        echo "$VEHICLES_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$VEHICLES_RESPONSE"
        echo ""
        
        # Extract first vehicle ID for testing
        VEHICLE_ID=$(echo $VEHICLES_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
        
        if [ ! -z "$VEHICLE_ID" ]; then
            echo "Found vehicle ID: $VEHICLE_ID"
            echo ""
            
            # Step 6: Test vehicle commands
            read -p "Do you want to test vehicle commands? (y/n): " TEST_COMMANDS
            
            if [ "$TEST_COMMANDS" = "y" ]; then
                echo ""
                echo "Step 6: Testing vehicle commands..."
                
                # Wake vehicle
                echo "Waking vehicle..."
                curl -s -X POST $SERVER_URL/api/tesla/vehicles/$VEHICLE_ID/wake \
                  -H "Authorization: Bearer $TOKEN" \
                  --insecure
                echo ""
                
                sleep 2
                
                # Flash lights
                echo "Flashing lights..."
                curl -s -X POST $SERVER_URL/api/tesla/vehicles/$VEHICLE_ID/command/flash_lights \
                  -H "Authorization: Bearer $TOKEN" \
                  --insecure
                echo ""
                
                echo "✅ Vehicle commands test complete!"
            fi
        else
            echo "No vehicles found or unable to parse vehicle ID"
        fi
    else
        echo "❌ Failed to connect Tesla account"
    fi
else
    echo "Skipping OAuth callback submission"
fi

echo ""
echo "========================================="
echo "Test Complete!"
echo "========================================="