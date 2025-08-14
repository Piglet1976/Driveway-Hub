#!/bin/bash

# Security Validation Script for Tesla Credentials
# Validates secure environment setup without exposing secrets

set -e

ENV_FILE="/opt/driveway-hub/.env.production"

echo "=== SECURITY VALIDATION ==="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# Check if environment file exists
if [[ ! -f "$ENV_FILE" ]]; then
    echo -e "${RED}❌ Environment file not found: $ENV_FILE${NC}"
    echo "Run: ./secure-deploy.sh first"
    exit 1
fi

echo "Validating: $ENV_FILE"
echo ""

# 1. Check file permissions
PERMS=$(stat -c %a "$ENV_FILE")
if [[ "$PERMS" == "600" ]]; then
    print_check 0 "File permissions (600)"
else
    print_check 1 "File permissions (found: $PERMS, expected: 600)"
fi

# 2. Check file ownership
OWNER=$(stat -c %U "$ENV_FILE")
CURRENT_USER=$(whoami)
if [[ "$OWNER" == "$CURRENT_USER" ]]; then
    print_check 0 "File ownership ($OWNER)"
else
    print_check 1 "File ownership (found: $OWNER, expected: $CURRENT_USER)"
fi

# 3. Check Tesla Client ID exists and format
if grep -q "TESLA_CLIENT_ID=" "$ENV_FILE" && ! grep -q "TESLA_CLIENT_ID=PASTE_YOUR" "$ENV_FILE"; then
    CLIENT_ID_LENGTH=$(grep "TESLA_CLIENT_ID=" "$ENV_FILE" | cut -d'=' -f2 | wc -c)
    if [[ $CLIENT_ID_LENGTH -gt 10 ]]; then
        print_check 0 "Tesla Client ID configured"
    else
        print_check 1 "Tesla Client ID too short"
    fi
else
    print_check 1 "Tesla Client ID not configured"
fi

# 4. Check Tesla Client Secret exists and format
if grep -q "TESLA_CLIENT_SECRET=" "$ENV_FILE" && ! grep -q "TESLA_CLIENT_SECRET=PASTE_YOUR" "$ENV_FILE"; then
    SECRET_LENGTH=$(grep "TESLA_CLIENT_SECRET=" "$ENV_FILE" | cut -d'=' -f2 | wc -c)
    if [[ $SECRET_LENGTH -gt 20 ]]; then
        print_check 0 "Tesla Client Secret configured"
    else
        print_check 1 "Tesla Client Secret too short"
    fi
else
    print_check 1 "Tesla Client Secret not configured"
fi

# 5. Check database password strength
if grep -q "DB_PASSWORD=" "$ENV_FILE" && ! grep -q "DB_PASSWORD=CHANGE_ME" "$ENV_FILE"; then
    DB_PASS_LENGTH=$(grep "DB_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2 | wc -c)
    if [[ $DB_PASS_LENGTH -gt 32 ]]; then
        print_check 0 "Database password strength (32+ chars)"
    else
        print_check 1 "Database password too weak"
    fi
else
    print_check 1 "Database password not configured"
fi

# 6. Check JWT secret strength
if grep -q "JWT_SECRET=" "$ENV_FILE" && ! grep -q "JWT_SECRET=CHANGE_ME" "$ENV_FILE"; then
    JWT_LENGTH=$(grep "JWT_SECRET=" "$ENV_FILE" | cut -d'=' -f2 | wc -c)
    if [[ $JWT_LENGTH -gt 64 ]]; then
        print_check 0 "JWT secret strength (64+ chars)"
    else
        print_check 1 "JWT secret too weak"
    fi
else
    print_check 1 "JWT secret not configured"
fi

# 7. Check Redis password
if grep -q "REDIS_PASSWORD=" "$ENV_FILE" && ! grep -q "REDIS_PASSWORD=CHANGE_ME" "$ENV_FILE"; then
    REDIS_PASS_LENGTH=$(grep "REDIS_PASSWORD=" "$ENV_FILE" | cut -d'=' -f2 | wc -c)
    if [[ $REDIS_PASS_LENGTH -gt 32 ]]; then
        print_check 0 "Redis password strength (32+ chars)"
    else
        print_check 1 "Redis password too weak"
    fi
else
    print_check 1 "Redis password not configured"
fi

# 8. Check production URLs
if grep -q "DOMAIN=https://driveway-hub.app" "$ENV_FILE"; then
    print_check 0 "Production domain configured"
else
    print_check 1 "Production domain not configured"
fi

# 9. Check Tesla OAuth URLs
if grep -q "TESLA_OAUTH_REDIRECT_URI=https://driveway-hub.app" "$ENV_FILE"; then
    print_check 0 "Tesla OAuth redirect URI configured"
else
    print_check 1 "Tesla OAuth redirect URI not configured"
fi

# 10. Check for placeholder values
PLACEHOLDER_COUNT=$(grep -c "CHANGE_ME\|PASTE_YOUR\|your_actual" "$ENV_FILE" 2>/dev/null || echo "0")
if [[ $PLACEHOLDER_COUNT -eq 0 ]]; then
    print_check 0 "No placeholder values found"
else
    print_check 1 "Found $PLACEHOLDER_COUNT placeholder values to replace"
fi

echo ""
echo "=== DOCKER ENVIRONMENT TEST ==="

# Test if Docker can load the environment
cd /opt/driveway-hub
if docker-compose --env-file .env.production config >/dev/null 2>&1; then
    print_check 0 "Docker environment loading"
else
    print_check 1 "Docker environment loading failed"
fi

echo ""
echo "=== SECURITY RECOMMENDATIONS ==="

# Additional security checks
if [[ -f ".env" ]]; then
    print_warning "Development .env file exists - ensure it's not used in production"
fi

if [[ -f ".env.production.local" ]]; then
    print_warning "Additional environment file found: .env.production.local"
fi

# Check if secrets might be in logs
if docker-compose logs app 2>/dev/null | grep -i "tesla_client_secret\|jwt_secret\|db_password" >/dev/null; then
    print_warning "Possible secrets in application logs - review log output"
else
    print_check 0 "No secrets detected in application logs"
fi

echo ""
echo "=== TESLA DEVELOPER PORTAL CHECKLIST ==="
echo "Verify these settings in https://developer.tesla.com/dashboard:"
echo ""
echo "✓ Allowed Origins: https://driveway-hub.app"
echo "✓ Redirect URIs: https://driveway-hub.app/auth/tesla/callback"
echo "✓ Success URL: https://driveway-hub.app/auth/success"
echo "✓ Required Scopes: openid, offline_access, user_data, vehicle_device_data, vehicle_cmds, vehicle_charging_cmds"
echo ""

echo "=== VALIDATION COMPLETE ==="