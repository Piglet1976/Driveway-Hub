#!/bin/bash

# Secure Deployment Script for Tesla Credentials
# This script handles secure environment variable setup

set -e

DEPLOY_DIR="/opt/driveway-hub"
ENV_FILE="$DEPLOY_DIR/.env.production"

echo "=== SECURE TESLA CREDENTIAL SETUP ==="
echo "Setting up secure environment variables for production..."

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
    echo "ERROR: Do not run this script as root for security"
    echo "Run as regular user: ./secure-deploy.sh"
    exit 1
fi

# Function to generate secure password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Function to prompt for Tesla credentials
prompt_tesla_credentials() {
    echo ""
    echo "=== TESLA API CREDENTIALS SETUP ==="
    echo "Get these from: https://developer.tesla.com/dashboard"
    echo ""
    
    read -p "Enter your Tesla Client ID: " TESLA_CLIENT_ID
    while [[ -z "$TESLA_CLIENT_ID" ]]; do
        echo "Tesla Client ID cannot be empty"
        read -p "Enter your Tesla Client ID: " TESLA_CLIENT_ID
    done
    
    read -s -p "Enter your Tesla Client Secret: " TESLA_CLIENT_SECRET
    echo ""
    while [[ -z "$TESLA_CLIENT_SECRET" ]]; do
        echo "Tesla Client Secret cannot be empty"
        read -s -p "Enter your Tesla Client Secret: " TESLA_CLIENT_SECRET
        echo ""
    done
    
    echo "✅ Tesla credentials captured securely"
}

# Function to create secure environment file
create_secure_env() {
    echo ""
    echo "=== GENERATING SECURE PASSWORDS ==="
    
    # Generate secure passwords
    DB_PASSWORD=$(generate_password)
    REDIS_PASSWORD=$(generate_password)
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)
    
    echo "✅ Generated secure database password"
    echo "✅ Generated secure Redis password"
    echo "✅ Generated secure JWT secret"
    
    echo ""
    echo "=== CREATING SECURE ENVIRONMENT FILE ==="
    
    # Create the secure environment file
    cat > "$ENV_FILE" << EOF
# PRODUCTION ENVIRONMENT - driveway-hub.app
# Generated: $(date)
# KEEP THIS FILE SECURE - NEVER COMMIT TO VERSION CONTROL

NODE_ENV=production
BUILD_TARGET=production

# Database Configuration
DB_USER=postgres
DB_PASSWORD=$DB_PASSWORD
DB_NAME=driveway_hub_prod
DB_HOST=postgres
DB_PORT=5432

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD

# JWT Security
JWT_SECRET=$JWT_SECRET

# Tesla API Credentials
TESLA_CLIENT_ID=$TESLA_CLIENT_ID
TESLA_CLIENT_SECRET=$TESLA_CLIENT_SECRET

# Tesla OAuth URLs
TESLA_OAUTH_REDIRECT_URI=https://driveway-hub.app/auth/tesla/callback
TESLA_SUCCESS_URL=https://driveway-hub.app/auth/success
TESLA_OAUTH_SCOPE=openid offline_access user_data vehicle_device_data vehicle_cmds vehicle_charging_cmds

# Production URLs
DOMAIN=https://driveway-hub.app
FRONTEND_URL=https://driveway-hub.app
REACT_APP_API_URL=https://driveway-hub.app/api

# Docker Configuration
VOLUME_MOUNT=
NODE_MODULES_VOLUME=
EOF

    # Secure the file permissions
    chmod 600 "$ENV_FILE"
    
    echo "✅ Environment file created: $ENV_FILE"
    echo "✅ File permissions secured (600)"
}

# Function to backup existing environment file
backup_existing_env() {
    if [[ -f "$ENV_FILE" ]]; then
        echo "⚠️  Backing up existing environment file..."
        cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d-%H%M%S)"
        echo "✅ Backup created"
    fi
}

# Function to validate Tesla credentials
validate_tesla_credentials() {
    echo ""
    echo "=== VALIDATING TESLA CREDENTIALS ==="
    
    # Check if credentials look valid (basic format check)
    if [[ ${#TESLA_CLIENT_ID} -lt 10 ]]; then
        echo "❌ Tesla Client ID seems too short"
        exit 1
    fi
    
    if [[ ${#TESLA_CLIENT_SECRET} -lt 20 ]]; then
        echo "❌ Tesla Client Secret seems too short"
        exit 1
    fi
    
    echo "✅ Tesla credentials format looks valid"
}

# Function to set secure file ownership
secure_file_ownership() {
    echo ""
    echo "=== SECURING FILE OWNERSHIP ==="
    
    # Make sure only the current user can read the file
    chown $USER:$USER "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    
    echo "✅ File ownership secured"
    echo "   Owner: $USER"
    echo "   Permissions: 600 (read/write for owner only)"
}

# Main execution
main() {
    echo "Starting secure credential setup for driveway-hub.app..."
    
    # Check if deploy directory exists
    if [[ ! -d "$DEPLOY_DIR" ]]; then
        echo "❌ Deploy directory not found: $DEPLOY_DIR"
        echo "Run the main deployment script first"
        exit 1
    fi
    
    cd "$DEPLOY_DIR"
    
    # Backup existing environment file
    backup_existing_env
    
    # Prompt for Tesla credentials
    prompt_tesla_credentials
    
    # Validate credentials
    validate_tesla_credentials
    
    # Create secure environment file
    create_secure_env
    
    # Secure file ownership
    secure_file_ownership
    
    echo ""
    echo "=== SECURITY SUMMARY ==="
    echo "✅ Secure passwords generated for database and Redis"
    echo "✅ 64-character JWT secret generated"
    echo "✅ Tesla API credentials configured"
    echo "✅ Environment file secured with 600 permissions"
    echo "✅ File owned by user: $USER"
    echo ""
    echo "Environment file location: $ENV_FILE"
    echo ""
    echo "IMPORTANT SECURITY NOTES:"
    echo "• Never commit .env.production to version control"
    echo "• Keep Tesla credentials secure and rotate regularly"
    echo "• Generated passwords are cryptographically secure"
    echo "• File permissions prevent other users from reading"
    echo ""
    echo "Next step: Deploy with secure credentials"
    echo "Command: docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production up -d"
}

# Run main function
main