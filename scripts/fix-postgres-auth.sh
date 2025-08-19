#!/bin/bash

# PostgreSQL Password Authentication Fix Script
# This script fixes the common Docker PostgreSQL password mismatch issue

echo "========================================="
echo "PostgreSQL Authentication Fix"
echo "========================================="
echo ""
echo "This script will fix the PostgreSQL password authentication issue."
echo "The problem occurs when PostgreSQL was initialized with a different password"
echo "than what's currently in your .env.production file."
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENV_FILE=".env.production"
COMPOSE_FILES="-f docker-compose.yml"
PROJECT_NAME="driveway-hub"

# Check if .env.production exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: $ENV_FILE not found!${NC}"
    exit 1
fi

# Load environment variables
source $ENV_FILE

echo "Current configuration:"
echo "  DB_USER: ${DB_USER:-postgres}"
echo "  DB_PASSWORD: ${DB_PASSWORD}"
echo "  DB_NAME: ${DB_NAME:-driveway_hub_dev}"
echo ""

# Ask for confirmation
read -p "Do you want to proceed with fixing the PostgreSQL authentication? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "========================================="
echo "Solution 1: Update password in running container"
echo "========================================="

# Try to update password in running container
echo "Attempting to update password in running PostgreSQL container..."

# Check if postgres container is running
if docker ps | grep -q "${PROJECT_NAME}-postgres"; then
    echo "PostgreSQL container is running. Updating password..."
    
    # Update the postgres user password
    docker exec ${PROJECT_NAME}-postgres psql -U postgres -c "ALTER USER postgres PASSWORD '${DB_PASSWORD}';" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Password updated successfully in running container!${NC}"
        
        # Restart app container to apply changes
        echo "Restarting app container..."
        docker compose $COMPOSE_FILES --env-file $ENV_FILE restart app
        
        echo -e "${GREEN}✅ App container restarted. Testing connection...${NC}"
        sleep 5
        
        # Test the connection
        docker compose $COMPOSE_FILES --env-file $ENV_FILE exec app node -e "
        const { Pool } = require('pg');
        const pool = new Pool({
            host: 'postgres',
            port: 5432,
            database: '${DB_NAME:-driveway_hub_dev}',
            user: '${DB_USER:-postgres}',
            password: '${DB_PASSWORD}'
        });
        pool.query('SELECT NOW()', (err, res) => {
            if (err) {
                console.error('❌ Connection failed:', err.message);
                process.exit(1);
            } else {
                console.log('✅ Connection successful! Time:', res.rows[0].now);
                process.exit(0);
            }
        });
        " 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Database connection successful! Problem fixed.${NC}"
            exit 0
        else
            echo -e "${YELLOW}⚠️  Connection test failed. Trying Solution 2...${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Could not update password in running container. Trying Solution 2...${NC}"
    fi
else
    echo -e "${YELLOW}PostgreSQL container not running. Starting Solution 2...${NC}"
fi

echo ""
echo "========================================="
echo "Solution 2: Reset PostgreSQL data volume"
echo "========================================="
echo -e "${YELLOW}WARNING: This will delete all existing database data!${NC}"
echo "You will need to recreate users and restore data afterwards."
echo ""

read -p "Do you want to proceed with resetting the PostgreSQL volume? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Trying alternative solution..."
    
    echo ""
    echo "========================================="
    echo "Solution 3: Manual password update"
    echo "========================================="
    
    echo "You can manually fix this by:"
    echo "1. Connect to the PostgreSQL container:"
    echo "   docker exec -it ${PROJECT_NAME}-postgres psql -U postgres"
    echo ""
    echo "2. Run this SQL command:"
    echo "   ALTER USER postgres PASSWORD '${DB_PASSWORD}';"
    echo ""
    echo "3. Exit psql (\\q) and restart the app container:"
    echo "   docker compose $COMPOSE_FILES --env-file $ENV_FILE restart app"
    
    exit 0
fi

echo ""
echo "Stopping all containers..."
docker compose $COMPOSE_FILES --env-file $ENV_FILE down

echo "Removing PostgreSQL data volume..."
docker volume rm ${PROJECT_NAME}_postgres_data 2>/dev/null || docker volume rm postgres_data 2>/dev/null

echo "Starting containers with fresh PostgreSQL instance..."
docker compose $COMPOSE_FILES --env-file $ENV_FILE up -d postgres

echo "Waiting for PostgreSQL to initialize..."
sleep 10

echo "Starting app container..."
docker compose $COMPOSE_FILES --env-file $ENV_FILE up -d app

echo "Waiting for services to be ready..."
sleep 10

# Test the connection
echo "Testing database connection..."
docker compose $COMPOSE_FILES --env-file $ENV_FILE exec app node -e "
const { Pool } = require('pg');
const pool = new Pool({
    host: 'postgres',
    port: 5432,
    database: '${DB_NAME:-driveway_hub_dev}',
    user: '${DB_USER:-postgres}',
    password: '${DB_PASSWORD}'
});
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Connection failed:', err.message);
        process.exit(1);
    } else {
        console.log('✅ Connection successful! Time:', res.rows[0].now);
        process.exit(0);
    }
});
" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database connection successful! Problem fixed.${NC}"
    echo ""
    echo "Note: Database has been reset. You'll need to:"
    echo "1. Run schema migrations"
    echo "2. Restore any data backups"
    echo "3. Create test users"
else
    echo -e "${RED}❌ Connection still failing. Please check your configuration.${NC}"
    echo ""
    echo "Debugging steps:"
    echo "1. Check if containers are running: docker ps"
    echo "2. Check container logs: docker logs ${PROJECT_NAME}-postgres"
    echo "3. Check app logs: docker logs ${PROJECT_NAME}-app"
fi

echo ""
echo "========================================="
echo "Fix attempt complete!"
echo "========================================="