#!/bin/bash

# DigitalOcean Deployment Script for Driveway Hub Tesla App
# This script sets up your app on a DigitalOcean droplet

set -e

echo "=== DigitalOcean Driveway Hub Deployment ==="
echo "Setting up Tesla-integrated parking platform..."

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
echo "Installing Docker..."
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
echo "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add current user to docker group
sudo usermod -aG docker $USER

# Install Git
echo "Installing Git..."
sudo apt install -y git

# Clone your repository (you'll need to update this with your repo URL)
echo "Cloning repository..."
if [ ! -d "/opt/driveway-hub" ]; then
    sudo mkdir -p /opt/driveway-hub
    sudo chown $USER:$USER /opt/driveway-hub
    git clone https://github.com/your-username/driveway-hub.git /opt/driveway-hub
fi

cd /opt/driveway-hub

# Install Certbot for SSL certificates
echo "Installing Certbot for SSL..."
sudo apt install -y certbot

# Generate SSL certificates for driveway-hub.app
echo "Generating SSL certificates..."
sudo mkdir -p /opt/driveway-hub/nginx/ssl

# Stop nginx if running to allow certbot to bind to port 80
sudo systemctl stop nginx 2>/dev/null || true

# Generate certificates using certbot standalone
sudo certbot certonly --standalone \
    --email your-email@domain.com \
    --agree-tos \
    --no-eff-email \
    -d driveway-hub.app \
    -d www.driveway-hub.app

# Copy certificates to nginx directory
sudo cp /etc/letsencrypt/live/driveway-hub.app/fullchain.pem /opt/driveway-hub/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/driveway-hub.app/privkey.pem /opt/driveway-hub/nginx/ssl/key.pem
sudo chown $USER:$USER /opt/driveway-hub/nginx/ssl/*.pem

# Create production environment file
echo "Setting up production environment..."
cp .env.production .env.production.local

echo ""
echo "=== IMPORTANT: Update Environment Variables ==="
echo "Edit .env.production.local with your actual values:"
echo "  - TESLA_CLIENT_ID"
echo "  - TESLA_CLIENT_SECRET"
echo "  - DB_PASSWORD"
echo "  - REDIS_PASSWORD"
echo "  - JWT_SECRET"
echo ""
echo "Run: nano .env.production.local"
echo ""

# Create systemd service for auto-restart
echo "Creating systemd service..."
sudo tee /etc/systemd/system/driveway-hub.service > /dev/null <<EOF
[Unit]
Description=Driveway Hub Tesla App
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/driveway-hub
ExecStart=/usr/local/bin/docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production.local up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.yml -f docker-compose.production.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Set up automatic SSL renewal
echo "Setting up SSL certificate auto-renewal..."
echo "0 12 * * * /usr/bin/certbot renew --quiet && /usr/local/bin/docker-compose -f /opt/driveway-hub/docker-compose.yml -f /opt/driveway-hub/docker-compose.production.yml restart nginx" | sudo crontab -

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable driveway-hub

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "Next steps:"
echo "1. Update .env.production.local with your Tesla API credentials"
echo "2. Start the application: sudo systemctl start driveway-hub"
echo "3. Check logs: docker-compose logs -f"
echo "4. Your app will be available at: https://driveway-hub.app"
echo ""
echo "Tesla OAuth Flow URLs:"
echo "  - Authorization: https://driveway-hub.app/api/auth/tesla"
echo "  - Callback: https://driveway-hub.app/auth/tesla/callback"
echo "  - Success: https://driveway-hub.app/auth/success"
echo ""