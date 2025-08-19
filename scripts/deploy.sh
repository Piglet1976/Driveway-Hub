#!/bin/bash

# Deployment script for Driveway Hub
# Usage: ./scripts/deploy.sh [development|production]

set -e

ENVIRONMENT=${1:-development}
PROJECT_NAME="driveway-hub"

echo "🚀 Deploying Driveway Hub - Environment: $ENVIRONMENT"

# Validate environment
if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "production" ]]; then
    echo "❌ Error: Environment must be 'development' or 'production'"
    exit 1
fi

# Load environment variables
if [[ -f ".env.$ENVIRONMENT" ]]; then
    echo "📄 Loading environment from .env.$ENVIRONMENT"
    export $(cat .env.$ENVIRONMENT | xargs)
else
    echo "⚠️  Warning: .env.$ENVIRONMENT not found, using defaults"
fi

# Pre-deployment checks
echo "🔍 Running pre-deployment checks..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    exit 1
fi

# Check if required environment variables are set for production
if [[ "$ENVIRONMENT" == "production" ]]; then
    required_vars=("DB_PASSWORD" "JWT_SECRET" "TESLA_CLIENT_ID" "TESLA_CLIENT_SECRET" "DOMAIN")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            echo "❌ Error: Required environment variable $var is not set"
            exit 1
        fi
    done
fi

# Build and deploy based on environment
if [[ "$ENVIRONMENT" == "development" ]]; then
    echo "🛠️  Building for development..."
    
    # Stop existing containers
    docker compose down
    
    # Build and start services
    docker compose --env-file .env.development up --build -d
    
    echo "✅ Development environment deployed successfully!"
    echo "📊 API: http://localhost:3000"
    echo "🎨 Frontend: http://localhost:3001"
    echo "🗄️  Database: localhost:5433"
    
elif [[ "$ENVIRONMENT" == "production" ]]; then
    echo "🏭 Building for production..."
    
    # Create SSL directory if it doesn't exist
    mkdir -p nginx/ssl
    
    # Check for SSL certificates
    if [[ ! -f "nginx/ssl/cert.pem" || ! -f "nginx/ssl/key.pem" ]]; then
        echo "⚠️  SSL certificates not found. Generate them before deploying to production."
        echo "📝 You can use Let's Encrypt with certbot or provide your own certificates"
        echo "   Place cert.pem and key.pem in nginx/ssl/ directory"
    fi
    
    # Stop existing containers
    docker compose -f docker-compose.yml -f docker-compose.production.yml down
    
    # Build and start production services
    docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production up --build -d
    
    echo "✅ Production environment deployed successfully!"
    echo "🌐 Domain: $DOMAIN"
    echo "🔒 HTTPS: https://$DOMAIN"
fi

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
if docker compose ps | grep -q "unhealthy"; then
    echo "⚠️  Some services are unhealthy. Check logs with:"
    echo "   docker compose logs [service-name]"
else
    echo "✅ All services are healthy!"
fi

# Display running containers
echo ""
echo "📦 Running containers:"
docker compose ps

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📚 Next steps:"
if [[ "$ENVIRONMENT" == "development" ]]; then
    echo "   • Visit http://localhost:3001 to access the frontend"
    echo "   • API documentation: http://localhost:3000/api/health"
    echo "   • View logs: docker compose logs -f [service-name]"
else
    echo "   • Configure your domain DNS to point to this server"
    echo "   • Set up SSL certificates in nginx/ssl/"
    echo "   • Configure Tesla API webhooks to point to your domain"
    echo "   • Monitor logs: docker compose -f docker-compose.yml -f docker-compose.production.yml logs -f"
fi