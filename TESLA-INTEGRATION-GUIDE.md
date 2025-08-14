# Tesla OAuth Integration Guide

## Current Implementation Status

### ✅ Completed
1. **Tesla OAuth Service** (`src/services/tesla.service.ts`)
   - PKCE flow implementation for enhanced security
   - Token management with automatic refresh
   - Vehicle data fetching and synchronization
   - Command sending capabilities

2. **API Endpoints**
   - `GET /api/auth/tesla` - Initiates OAuth flow
   - `POST /api/auth/tesla/callback` - Handles OAuth callback
   - `GET /api/tesla/vehicles` - Lists user's Tesla vehicles
   - `GET /api/tesla/vehicles/:vehicleId` - Gets specific vehicle data
   - `POST /api/tesla/vehicles/:vehicleId/wake` - Wakes up vehicle
   - `POST /api/tesla/vehicles/:vehicleId/command/:command` - Sends commands
   - `GET /api/tesla/status` - Checks connection status

3. **Database Schema**
   - Tesla OAuth token storage in users table
   - Vehicle synchronization in vehicles table
   - PKCE code verifier support

## Setup Instructions

### 1. Update Tesla Developer Portal

Go to your Tesla Developer account and update these settings:

**Redirect URLs:**
```
https://161.35.176.111/api/auth/tesla/callback
```

**Required Scopes:**
- openid
- offline_access
- user_data
- vehicle_device_data
- vehicle_cmds
- vehicle_charging_cmds

### 2. Configure Environment Variables

Update your `.env.production` or create `.env.tesla`:

```bash
# Tesla OAuth Credentials
TESLA_CLIENT_ID=d20a2b52-df7d-495f-b6e5-97c496f1d4d0
TESLA_CLIENT_SECRET=YOUR_SECRET_HERE  # Get this from Tesla Developer Portal

# OAuth URLs
TESLA_OAUTH_REDIRECT_URI=https://161.35.176.111/api/auth/tesla/callback
TESLA_SUCCESS_URL=https://161.35.176.111/dashboard
TESLA_OAUTH_SCOPE=openid offline_access user_data vehicle_device_data vehicle_cmds vehicle_charging_cmds
```

### 3. Apply Database Migration

Run the Tesla OAuth migration to add required fields:

```bash
docker exec -it driveway-hub-postgres-1 psql -U postgres -d driveway_hub_prod -f /database/tesla-oauth-migration.sql
```

Or manually:
```sql
psql -h 161.35.176.111 -U postgres -d driveway_hub_prod < database/tesla-oauth-migration.sql
```

### 4. Deploy Updated Code

```bash
# Build and deploy
docker-compose -f docker-compose.production.yml build backend
docker-compose -f docker-compose.production.yml up -d backend
```

## Testing the Integration

### Step 1: Get Authentication Token
```bash
# Login to get JWT token
curl -X POST https://161.35.176.111/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"driver@test.com"}' \
  --insecure

# Save the token from response
export TOKEN="YOUR_JWT_TOKEN_HERE"
```

### Step 2: Initiate Tesla OAuth
```bash
# Get Tesla auth URL
curl -X GET https://161.35.176.111/api/auth/tesla \
  -H "Authorization: Bearer $TOKEN" \
  --insecure

# This returns an auth_url - open it in browser to authorize
```

### Step 3: Complete OAuth Flow
After authorizing in Tesla's portal, you'll be redirected back with a code.
The frontend should capture this and send to callback endpoint:

```bash
# Submit OAuth callback
curl -X POST https://161.35.176.111/api/auth/tesla/callback \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code":"AUTH_CODE_FROM_TESLA","state":"STATE_FROM_URL"}' \
  --insecure
```

### Step 4: Fetch Tesla Vehicles
```bash
# Get vehicles
curl -X GET https://161.35.176.111/api/tesla/vehicles \
  -H "Authorization: Bearer $TOKEN" \
  --insecure
```

### Step 5: Get Vehicle Data
```bash
# Get specific vehicle data (replace VEHICLE_ID)
curl -X GET https://161.35.176.111/api/tesla/vehicles/VEHICLE_ID \
  -H "Authorization: Bearer $TOKEN" \
  --insecure
```

### Step 6: Send Commands
```bash
# Wake up vehicle
curl -X POST https://161.35.176.111/api/tesla/vehicles/VEHICLE_ID/wake \
  -H "Authorization: Bearer $TOKEN" \
  --insecure

# Honk horn (test command)
curl -X POST https://161.35.176.111/api/tesla/vehicles/VEHICLE_ID/command/honk_horn \
  -H "Authorization: Bearer $TOKEN" \
  --insecure

# Flash lights
curl -X POST https://161.35.176.111/api/tesla/vehicles/VEHICLE_ID/command/flash_lights \
  -H "Authorization: Bearer $TOKEN" \
  --insecure
```

## Available Tesla Commands

### Basic Controls
- `honk_horn` - Honk the horn
- `flash_lights` - Flash the lights
- `remote_start_drive` - Remote start (requires password)

### Door & Trunk
- `door_lock` - Lock doors
- `door_unlock` - Unlock doors  
- `actuate_trunk` - Open/close trunk (front or rear)

### Climate
- `auto_conditioning_start` - Start climate control
- `auto_conditioning_stop` - Stop climate control
- `set_temps` - Set temperature (requires body: `{driver_temp: 20, passenger_temp: 20}`)

### Charging
- `charge_port_door_open` - Open charge port
- `charge_port_door_close` - Close charge port
- `charge_start` - Start charging
- `charge_stop` - Stop charging
- `set_charge_limit` - Set charge limit (requires body: `{percent: 80}`)

### Location & Summon
- `set_valet_mode` - Enable/disable valet mode
- `set_sentry_mode` - Enable/disable sentry mode

## Troubleshooting

### Token Expired
If tokens expire, the service automatically attempts refresh. If refresh fails:
1. User must re-authenticate through OAuth flow
2. Check `/api/tesla/status` endpoint for connection status

### SSL Certificate Issues
For self-signed certificates, use `--insecure` flag with curl or configure proper certificates.

### Database Connection
Ensure PostgreSQL has the required Tesla fields:
- tesla_access_token
- tesla_refresh_token
- tesla_token_expires_at
- tesla_code_verifier
- tesla_token_scope

### Common Errors

1. **"Code verifier not found"**
   - OAuth flow was interrupted
   - User needs to restart from `/api/auth/tesla`

2. **"Invalid state parameter"**
   - State mismatch between initiation and callback
   - Security check failed - restart OAuth flow

3. **"Tesla API request failed"**
   - Check if vehicle is awake
   - Verify token is valid
   - Check Tesla API status

## Security Notes

1. **PKCE Implementation**: Uses code verifier/challenge for enhanced security
2. **State Validation**: Prevents CSRF attacks
3. **Token Storage**: Encrypted in database
4. **Automatic Refresh**: Tokens refresh before expiration
5. **Scope Limitation**: Only requested scopes are granted

## Frontend Integration

The frontend should:
1. Call `/api/auth/tesla` to get auth URL
2. Open auth URL in new window/tab
3. Handle redirect back with code and state
4. Submit code and state to `/api/auth/tesla/callback`
5. Show success/error message
6. Refresh vehicle list after successful connection

## Monitoring

Check logs for Tesla integration:
```bash
docker logs driveway-hub-backend-1 | grep -i tesla
```

View Tesla connections:
```sql
SELECT * FROM tesla_connections;
```

## Next Steps

1. Add webhook support for real-time vehicle updates
2. Implement vehicle location tracking for parking
3. Add automated parking session management
4. Integrate charging status with driveway EV chargers
5. Add vehicle-specific pricing based on size/model