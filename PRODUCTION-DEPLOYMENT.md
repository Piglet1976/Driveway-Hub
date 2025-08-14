# 🚀 Production Deployment Guide - Driveway Hub Tesla App

Deploy your Tesla-integrated parking platform to **driveway-hub.app** with full HTTPS and real Tesla API integration.

## Prerequisites

✅ **Domain Ready**: `driveway-hub.app` pointing to your server  
✅ **Tesla API Credentials**: Client ID and Secret from Tesla Developer Portal  
✅ **Cloud Server**: DigitalOcean Droplet or AWS EC2 (Ubuntu 20.04+ recommended)  

## 🏗️ Deployment Steps

### 1. Server Setup

Create a new DigitalOcean Droplet:
- **Image**: Ubuntu 22.04 LTS
- **Size**: Basic ($24/month, 4GB RAM, 2 CPUs)
- **Datacenter**: Choose closest to your users
- **SSH Keys**: Add your public key

### 2. Domain Configuration

Point your domain to the server:
```bash
# A Record
driveway-hub.app → YOUR_SERVER_IP
www.driveway-hub.app → YOUR_SERVER_IP
```

### 3. Server Deployment

SSH into your server and run the setup script:

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Download and run deployment script
curl -o setup.sh https://raw.githubusercontent.com/your-username/driveway-hub/main/deploy/digitalocean-setup.sh
chmod +x setup.sh
./setup.sh
```

### 4. Configure Environment Variables

Edit the production environment file:

```bash
cd /opt/driveway-hub
nano .env.production.local
```

**Replace these values with your actual credentials:**

```env
# Database Security
DB_PASSWORD=your_super_secure_database_password_here

# Redis Security  
REDIS_PASSWORD=your_redis_password_here

# JWT Security (32+ characters)
JWT_SECRET=your_jwt_secret_minimum_32_characters_long

# Tesla API Credentials (from Tesla Developer Portal)
TESLA_CLIENT_ID=your_actual_tesla_client_id
TESLA_CLIENT_SECRET=your_actual_tesla_client_secret
```

### 5. Start the Application

```bash
# Create data directories
sudo mkdir -p /opt/driveway-hub/data/{postgres,redis}

# Start all services
sudo systemctl start driveway-hub

# Check status
sudo systemctl status driveway-hub

# View logs
cd /opt/driveway-hub
docker-compose logs -f
```

## 🔒 SSL Certificate Setup

The deployment script automatically generates Let's Encrypt SSL certificates for:
- `https://driveway-hub.app`
- `https://www.driveway-hub.app`

Certificates auto-renew via cron job.

## 🚗 Tesla Developer Configuration

Update your Tesla Developer app settings at https://developer.tesla.com:

### OAuth Configuration
```
Allowed Origins:
  https://driveway-hub.app

Redirect URIs:
  https://driveway-hub.app/auth/tesla/callback

Success URL:
  https://driveway-hub.app/auth/success
```

### Required Scopes
```
openid
offline_access
user_data
vehicle_device_data
vehicle_cmds
vehicle_charging_cmds
```

## 🧪 Testing Tesla Integration

### 1. Health Check
```bash
curl https://driveway-hub.app/api/health
```

### 2. Test Login
```bash
curl -X POST https://driveway-hub.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"driver@test.com"}'
```

### 3. Test Tesla OAuth
1. Visit: `https://driveway-hub.app`
2. Login with test account
3. Go to Tesla integration page
4. Click "Connect Tesla Account"
5. Complete OAuth flow

### 4. Test Tesla API Calls
```bash
# Get Tesla OAuth URL (requires valid JWT token)
curl https://driveway-hub.app/api/auth/tesla \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get Tesla vehicles (after OAuth completion)
curl https://driveway-hub.app/api/tesla/vehicles \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📊 Monitoring and Logs

### View Application Logs
```bash
cd /opt/driveway-hub

# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f nginx
```

### Check Service Status
```bash
# Docker containers
docker-compose ps

# System service
sudo systemctl status driveway-hub

# Nginx status
sudo systemctl status nginx
```

### Database Access
```bash
# Connect to production database
docker exec -it driveway-hub-postgres psql -U postgres -d driveway_hub_prod

# Check users
SELECT email, first_name, tesla_access_token IS NOT NULL as tesla_connected FROM users;
```

## 🔧 Maintenance Commands

### Update Application
```bash
cd /opt/driveway-hub
git pull origin main
docker-compose -f docker-compose.yml -f docker-compose.production.yml build
sudo systemctl restart driveway-hub
```

### Backup Database
```bash
docker exec driveway-hub-postgres pg_dump -U postgres driveway_hub_prod > backup-$(date +%Y%m%d).sql
```

### Restart Services
```bash
# Restart all
sudo systemctl restart driveway-hub

# Restart specific service
docker-compose restart app
docker-compose restart nginx
```

## 🌐 Production URLs

After successful deployment:

- **Main App**: https://driveway-hub.app
- **API Health**: https://driveway-hub.app/api/health  
- **Tesla OAuth**: https://driveway-hub.app/api/auth/tesla
- **Tesla Callback**: https://driveway-hub.app/auth/tesla/callback

## 🚨 Troubleshooting

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check nginx config
sudo nginx -t
```

### Tesla API Issues
- Verify client ID/secret in `.env.production.local`
- Check Tesla Developer Portal settings
- Ensure domain matches exactly
- Check application logs for Tesla API errors

### Database Connection Issues
```bash
# Check database logs
docker-compose logs postgres

# Test database connection
docker exec driveway-hub-postgres psql -U postgres -l
```

### Container Issues
```bash
# Check container health
docker-compose ps

# Restart unhealthy containers
docker-compose restart SERVICE_NAME

# Full rebuild
docker-compose down
docker-compose up --build -d
```

## 🎉 Success Verification

Your Tesla-integrated app is successfully deployed when:

✅ **HTTPS**: `https://driveway-hub.app` loads with valid SSL  
✅ **API**: Health endpoint returns status  
✅ **Database**: PostgreSQL connected and initialized  
✅ **Tesla OAuth**: Can initiate Tesla authentication  
✅ **Tesla API**: Can fetch real vehicle data  
✅ **Auto-restart**: Services restart automatically  

**Your Tesla parking platform is now live and ready for real vehicle integration!** 🚗⚡🏢