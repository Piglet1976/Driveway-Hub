#!/bin/bash

# Deploy SSL Configuration for driveway-hub.app
# Tesla Parking Platform SSL Deployment Script

set -e

echo "🚀 Starting SSL deployment for driveway-hub.app..."
echo "📍 Server: 161.35.176.111"
echo "🌐 Domain: driveway-hub.app"
echo ""

# Navigate to project directory
cd /opt/driveway-hub

# Ensure SSL certificates exist
if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
    echo "⚠️  SSL certificates not found. Creating self-signed certificates..."
    
    mkdir -p nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=DrivewayHub/CN=driveway-hub.app"
    
    chmod 644 nginx/ssl/cert.pem
    chmod 600 nginx/ssl/key.pem
    
    echo "✅ Self-signed certificates created"
fi

# Ensure data directories exist
echo "📁 Creating data directories..."
mkdir -p /opt/driveway-hub/data/postgres
mkdir -p /opt/driveway-hub/data/redis

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose down || true

# Deploy with production configuration
echo "🔨 Building and deploying with SSL configuration..."
docker compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production up -d --build

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 15

# Check container status
echo ""
echo "📊 Container status:"
docker compose -f docker-compose.yml -f docker-compose.production.yml ps

# Test deployments
echo ""
echo "🧪 Running deployment tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test HTTP to HTTPS redirect
echo "1️⃣ Testing HTTP → HTTPS redirect..."
HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -I http://localhost 2>/dev/null || echo "000")
if [ "$HTTP_RESPONSE" = "301" ] || [ "$HTTP_RESPONSE" = "302" ]; then
    echo "   ✅ HTTP redirect working (Status: $HTTP_RESPONSE)"
else
    echo "   ⚠️  HTTP redirect issue (Status: $HTTP_RESPONSE)"
fi

# Test HTTPS endpoint
echo "2️⃣ Testing HTTPS endpoint..."
HTTPS_RESPONSE=$(curl -k -s -o /dev/null -w "%{http_code}" -I https://localhost 2>/dev/null || echo "000")
if [ "$HTTPS_RESPONSE" = "200" ] || [ "$HTTPS_RESPONSE" = "304" ]; then
    echo "   ✅ HTTPS working (Status: $HTTPS_RESPONSE)"
else
    echo "   ⚠️  HTTPS issue (Status: $HTTPS_RESPONSE)"
fi

# Test API health
echo "3️⃣ Testing API health endpoint..."
API_HEALTH=$(curl -k -s https://localhost/api/health 2>/dev/null | grep -o '"status":"ok"' || echo "")
if [ -n "$API_HEALTH" ]; then
    echo "   ✅ API is healthy"
else
    echo "   ⚠️  API health check failed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SSL Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Your Tesla parking platform is now accessible at:"
echo "   🔐 https://driveway-hub.app"
echo "   🔐 https://www.driveway-hub.app"
echo ""
echo "🚗 Tesla OAuth Configuration:"
echo "   Update your Tesla Developer Portal with:"
echo "   • Redirect URI: https://driveway-hub.app/auth/tesla/callback"
echo "   • Success URL: https://driveway-hub.app/auth/success"
echo ""
echo "📝 Next Steps:"
echo "   1. Test in browser: https://driveway-hub.app"
echo "   2. Login with test credentials: driver@test.com / password123"
echo "   3. For production SSL certificates (Let's Encrypt):"
echo "      sudo apt-get install certbot"
echo "      sudo certbot certonly --standalone -d driveway-hub.app -d www.driveway-hub.app"
echo "      Then update nginx/ssl/ with the new certificates"
echo ""
echo "🔧 Useful Commands:"
echo "   View logs: docker compose -f docker-compose.yml -f docker-compose.production.yml logs -f"
echo "   Restart: docker compose -f docker-compose.yml -f docker-compose.production.yml restart"
echo "   Status: docker compose -f docker-compose.yml -f docker-compose.production.yml ps"