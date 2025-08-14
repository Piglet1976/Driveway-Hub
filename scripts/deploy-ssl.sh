#!/bin/bash

# Deploy SSL Configuration for Driveway Hub
# Run this script on your DigitalOcean server

set -e

echo "🚀 Starting SSL deployment for driveway-hub.com..."

# Navigate to project directory
cd /opt/driveway-hub

# Pull latest changes if using git
if [ -d ".git" ]; then
    echo "📦 Pulling latest changes..."
    git pull origin main || true
fi

# Copy production environment file if not exists
if [ ! -f ".env.production" ]; then
    echo "⚠️  .env.production not found. Please create it first!"
    exit 1
fi

# Ensure SSL certificates exist
if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
    echo "⚠️  SSL certificates not found in nginx/ssl/"
    echo "Creating self-signed certificates for testing..."
    
    mkdir -p nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=DrivewayHub/CN=driveway-hub.com"
    
    chmod 644 nginx/ssl/cert.pem
    chmod 600 nginx/ssl/key.pem
fi

# Ensure data directories exist for volumes
echo "📁 Creating data directories..."
mkdir -p /opt/driveway-hub/data/postgres
mkdir -p /opt/driveway-hub/data/redis

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose down || true

# Build and start services with production configuration
echo "🔨 Building and starting services with SSL..."
docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check container status
echo "📊 Container status:"
docker compose -f docker-compose.yml -f docker-compose.production.yml ps

# Test HTTP to HTTPS redirect
echo "🔄 Testing HTTP to HTTPS redirect..."
curl -I http://driveway-hub.com || true

# Test HTTPS endpoint
echo "🔐 Testing HTTPS endpoint..."
curl -k -I https://driveway-hub.com || true

# Test API health endpoint
echo "💚 Testing API health over HTTPS..."
curl -k https://driveway-hub.com/api/health || true

echo ""
echo "✅ SSL deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Test HTTPS access at: https://driveway-hub.com"
echo "2. If using self-signed certificates, browser will show security warning (expected)"
echo "3. For production, replace self-signed certificates with Let's Encrypt:"
echo "   - Install certbot: apt-get install certbot"
echo "   - Generate certificates: certbot certonly --standalone -d driveway-hub.com -d www.driveway-hub.com"
echo "   - Update nginx/ssl/ with the new certificates"
echo "4. Update Tesla Developer Portal with HTTPS callback URL:"
echo "   - Redirect URI: https://driveway-hub.com/auth/tesla/callback"
echo ""
echo "📋 View logs:"
echo "   docker compose -f docker-compose.yml -f docker-compose.production.yml logs -f"
echo ""
echo "🔧 Troubleshooting:"
echo "   - Check nginx logs: docker logs driveway-hub-nginx"
echo "   - Check app logs: docker compose logs app"
echo "   - Restart services: docker compose -f docker-compose.yml -f docker-compose.production.yml restart"