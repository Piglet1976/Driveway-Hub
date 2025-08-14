#!/bin/bash

# EMERGENCY SECRET ROTATION SCRIPT
# Use this script when secrets have been compromised

set -e

echo "=== EMERGENCY SECRET ROTATION ==="
echo "Generating new cryptographically secure secrets..."

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_action() {
    echo -e "${BLUE}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_critical() {
    echo -e "${RED}🚨 $1${NC}"
}

# Function to generate cryptographically secure passwords
generate_secure_password() {
    local length=${1:-32}
    openssl rand -base64 $((length * 3 / 4)) | tr -d "=+/" | cut -c1-$length
}

# Generate new secrets
print_action "Generating new database password (32 chars)..."
NEW_DB_PASSWORD=$(generate_secure_password 32)
print_success "Database password generated"

print_action "Generating new Redis password (32 chars)..."
NEW_REDIS_PASSWORD=$(generate_secure_password 32)
print_success "Redis password generated"

print_action "Generating new JWT secret (64 chars)..."
NEW_JWT_SECRET=$(generate_secure_password 64)
print_success "JWT secret generated"

# Display new secrets for manual copying (if needed)
echo ""
echo "=== NEW SECURE SECRETS ==="
echo "⚠️  Copy these immediately and store securely:"
echo ""
echo "NEW_DB_PASSWORD=$NEW_DB_PASSWORD"
echo "NEW_REDIS_PASSWORD=$NEW_REDIS_PASSWORD"
echo "NEW_JWT_SECRET=$NEW_JWT_SECRET"
echo ""

# Function to update environment file
update_environment_file() {
    local env_file=$1
    
    if [[ ! -f "$env_file" ]]; then
        print_warning "Environment file not found: $env_file"
        return 1
    fi
    
    print_action "Updating $env_file..."
    
    # Create backup with timestamp
    cp "$env_file" "$env_file.backup.$(date +%Y%m%d-%H%M%S)"
    print_success "Backup created: $env_file.backup.$(date +%Y%m%d-%H%M%S)"
    
    # Update secrets in the file
    sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$NEW_DB_PASSWORD/" "$env_file"
    sed -i "s/^REDIS_PASSWORD=.*/REDIS_PASSWORD=$NEW_REDIS_PASSWORD/" "$env_file"
    sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$NEW_JWT_SECRET/" "$env_file"
    
    # Secure the file permissions
    chmod 600 "$env_file"
    
    print_success "Environment file updated and secured"
}

# Update all environment files
ENV_FILES=(
    ".env.production"
    ".env.production.local"
    ".env.production.secure"
)

for env_file in "${ENV_FILES[@]}"; do
    if [[ -f "$env_file" ]]; then
        update_environment_file "$env_file"
    fi
done

echo ""
print_critical "IMMEDIATE ACTIONS REQUIRED:"
echo ""
echo "1. 🔄 RESTART ALL SERVICES with new secrets:"
echo "   docker-compose down"
echo "   docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production up -d"
echo ""
echo "2. 🗑️  INVALIDATE OLD SECRETS:"
echo "   - Old database password is now invalid"
echo "   - Old Redis password is now invalid"
echo "   - All existing JWT tokens are now invalid"
echo ""
echo "3. 🔐 VERIFY NEW SECRETS WORK:"
echo "   ./scripts/validate-secrets.sh"
echo ""
echo "4. 🧹 CLEANUP:"
echo "   - Remove any backup files with old secrets"
echo "   - Clear any caches that might contain old tokens"
echo "   - Inform users they need to login again"
echo ""

# Create validation commands
echo "=== VALIDATION COMMANDS ==="
echo ""
echo "# Test database connection with new password"
echo "docker exec driveway-hub-postgres psql -U postgres -d driveway_hub_prod -c 'SELECT 1;'"
echo ""
echo "# Test Redis connection with new password"  
echo "docker exec driveway-hub-redis redis-cli -a \$REDIS_PASSWORD ping"
echo ""
echo "# Test API health"
echo "curl -s https://driveway-hub.app/api/health"
echo ""

print_success "Secret rotation completed successfully!"
print_warning "Remember: All users will need to login again due to JWT secret change"