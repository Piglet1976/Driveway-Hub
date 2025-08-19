# 🚨 EMERGENCY SECRET ROTATION GUIDE

## Immediate Actions Required

Your production secrets were exposed and need to be rotated **immediately**.

### 🔄 **Option 1: Automated Rotation (Linux/Mac)**

```bash
# On your production server
cd /opt/driveway-hub
chmod +x scripts/emergency-secret-rotation.sh
./scripts/emergency-secret-rotation.sh
```

### 🔄 **Option 2: Manual Rotation (Windows/Manual)**

```powershell
# Run on Windows to generate new secrets
.\scripts\quick-secret-gen.ps1
```

Then manually update your `.env.production` file with the generated values.

### 🔄 **Option 3: Command Line Generation**

```bash
# Generate new database password (32 chars)
NEW_DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

# Generate new Redis password (32 chars)  
NEW_REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

# Generate new JWT secret (64 chars)
NEW_JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-64)

echo "DB_PASSWORD=$NEW_DB_PASSWORD"
echo "REDIS_PASSWORD=$NEW_REDIS_PASSWORD"  
echo "JWT_SECRET=$NEW_JWT_SECRET"
```

## 📝 **Manual Environment File Update**

Edit your `.env.production` file:

```bash
nano /opt/driveway-hub/.env.production
```

Replace these lines with your new values:
```env
DB_PASSWORD=YOUR_NEW_32_CHAR_DB_PASSWORD
REDIS_PASSWORD=YOUR_NEW_32_CHAR_REDIS_PASSWORD
JWT_SECRET=YOUR_NEW_64_CHAR_JWT_SECRET
```

**Keep your Tesla credentials unchanged - only rotate the compromised secrets.**

## 🔒 **Secure the Updated File**

```bash
# Set secure permissions
chmod 600 .env.production
chown $USER:$USER .env.production

# Verify permissions
ls -la .env.production  # Should show: -rw------- 1 user user
```

## 🚀 **Restart Services with New Secrets**

```bash
# Stop all services
docker-compose down

# Start with new environment
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production up -d

# Wait for services to start
sleep 30

# Check status
docker-compose ps
```

## 🧪 **Validate New Secrets Work**

```bash
# Test database connection
docker exec driveway-hub-postgres psql -U postgres -d driveway_hub_prod -c "SELECT 'DB Connected' as status;"

# Test Redis connection
docker exec driveway-hub-redis redis-cli -a $REDIS_PASSWORD ping

# Test API health
curl -s https://driveway-hub.app/api/health

# Run full validation
./scripts/validate-secrets.sh
```

## 🧹 **Cleanup Actions**

### 1. **Remove Old Backup Files**
```bash
# Remove any backup files that might contain old secrets
find /opt/driveway-hub -name "*.backup.*" -type f -delete

# Remove old environment files
rm -f .env.production.old .env.backup.*
```

### 2. **Clear Application Caches**
```bash
# Clear Redis cache (will use new password)
docker exec driveway-hub-redis redis-cli -a $REDIS_PASSWORD FLUSHALL

# Restart application to clear any in-memory caches
docker-compose restart app
```

### 3. **Inform Users**
- All existing JWT tokens are now invalid
- Users will need to login again
- Any saved sessions are cleared

## ⚠️ **Security Checklist**

- [ ] New database password generated (32+ chars)
- [ ] New Redis password generated (32+ chars)  
- [ ] New JWT secret generated (64+ chars)
- [ ] Environment file updated with new secrets
- [ ] File permissions secured (600)
- [ ] Services restarted with new environment
- [ ] Database connection tested
- [ ] Redis connection tested
- [ ] API health confirmed
- [ ] Old backup files removed
- [ ] Application caches cleared
- [ ] Users notified of re-login requirement

## 🔍 **Monitoring After Rotation**

```bash
# Monitor application logs for any auth issues
docker-compose logs -f app

# Check for any failed database connections
docker-compose logs postgres | grep -i "failed\|error"

# Check for any failed Redis connections
docker-compose logs redis | grep -i "failed\|error"
```

## 🚨 **If Problems Occur**

### Database Connection Issues
```bash
# Check database logs
docker-compose logs postgres

# Verify password in environment
grep "DB_PASSWORD" .env.production  # Should show new password

# Manual database test
docker exec -it driveway-hub-postgres psql -U postgres
```

### Redis Connection Issues  
```bash
# Check Redis logs
docker-compose logs redis

# Test Redis authentication
docker exec driveway-hub-redis redis-cli -a YOUR_NEW_REDIS_PASSWORD ping
```

### Application Issues
```bash
# Check app logs for JWT errors
docker-compose logs app | grep -i "jwt\|token\|auth"

# Restart just the app if needed
docker-compose restart app
```

## ✅ **Confirmation of Success**

Your secret rotation is complete when:
- All services are running and healthy
- Database connects with new password
- Redis connects with new password  
- API health check passes
- Users can login and receive new JWT tokens
- No old secrets exist in any files

**Your production environment is now secure with fresh secrets!** 🔒