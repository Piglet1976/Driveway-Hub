# 🔒 Secure Tesla Credential Management

## Overview
Secure setup for Tesla API credentials and production environment variables.

## 🚨 Security Requirements

### Tesla Developer Portal Setup
1. Login to https://developer.tesla.com/dashboard
2. Navigate to your application
3. Note your **Client ID** and **Client Secret**
4. Verify redirect URI: `https://driveway-hub.app/auth/tesla/callback`

## 🔐 Secure Deployment Steps

### 1. Upload Secure Deployment Script
```bash
# On your production server
scp scripts/secure-deploy.sh user@driveway-hub.app:/opt/driveway-hub/
ssh user@driveway-hub.app
cd /opt/driveway-hub
chmod +x secure-deploy.sh
```

### 2. Run Secure Credential Setup
```bash
# This will prompt for Tesla credentials securely
./secure-deploy.sh
```

**The script will:**
- Generate cryptographically secure passwords (32+ chars)
- Generate 64-character JWT secret
- Prompt for Tesla credentials (hidden input)
- Create `.env.production` with 600 permissions
- Secure file ownership

### 3. Verify Secure Configuration
```bash
# Check file permissions (should show 600)
ls -la .env.production

# Verify file ownership (should be your user)
stat .env.production

# Test environment loading (without exposing secrets)
docker-compose config 2>/dev/null | grep -E "(TESLA_CLIENT_ID|NODE_ENV)" || echo "Env loaded"
```

### 4. Deploy with Secure Environment
```bash
# Deploy using the secure environment file
docker-compose -f docker-compose.yml -f docker-compose.production.yml --env-file .env.production up -d
```

## 🔑 Manual Credential Setup (Alternative)

If you prefer manual setup:

### 1. Copy Template
```bash
cp .env.production.secure .env.production
```

### 2. Generate Secure Passwords
```bash
# Database password (32 chars)
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32

# Redis password (32 chars)  
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32

# JWT secret (64 chars)
openssl rand -base64 64 | tr -d "=+/" | cut -c1-64
```

### 3. Edit Environment File
```bash
nano .env.production

# Replace these values:
DB_PASSWORD=YOUR_GENERATED_DB_PASSWORD
REDIS_PASSWORD=YOUR_GENERATED_REDIS_PASSWORD
JWT_SECRET=YOUR_GENERATED_JWT_SECRET
TESLA_CLIENT_ID=YOUR_TESLA_CLIENT_ID
TESLA_CLIENT_SECRET=YOUR_TESLA_CLIENT_SECRET
```

### 4. Secure File Permissions
```bash
chmod 600 .env.production
chown $USER:$USER .env.production
```

## 🛡️ Security Best Practices

### Environment File Security
```bash
# ✅ CORRECT - Secure permissions
-rw------- 1 user user .env.production

# ❌ WRONG - Readable by others
-rw-r--r-- 1 user user .env.production
```

### Tesla Credential Rotation
```bash
# When rotating Tesla credentials:
1. Generate new credentials in Tesla Developer Portal
2. Update .env.production
3. Restart application: docker-compose restart app
4. Revoke old credentials in Tesla Portal
```

### Backup Security
```bash
# Create encrypted backup of credentials
gpg --symmetric --cipher-algo AES256 .env.production
# This creates .env.production.gpg

# Store backup securely and delete plaintext backup
rm .env.production.backup.*
```

## 🧪 Testing Secure Setup

### 1. Test Environment Loading
```bash
# Check that Docker can load environment
docker-compose config | grep -q "driveway-hub.app" && echo "✅ Environment loaded"
```

### 2. Test Tesla API Connection
```bash
# Test API health
curl -s https://driveway-hub.app/api/health

# Test Tesla OAuth URL generation (requires login token)
curl -s https://driveway-hub.app/api/auth/tesla \
  -H "Authorization: Bearer YOUR_TOKEN" | grep "auth.tesla.com"
```

### 3. Verify Security
```bash
# Check no secrets in logs
docker-compose logs app | grep -i "tesla_client_secret" && echo "❌ SECRET EXPOSED" || echo "✅ Secrets secure"

# Check file permissions
[[ $(stat -c %a .env.production) == "600" ]] && echo "✅ Permissions secure" || echo "❌ Permissions wrong"
```

## 🚨 Security Checklist

- [ ] `.env.production` has 600 permissions
- [ ] Tesla credentials from official Developer Portal
- [ ] Passwords are 32+ characters, cryptographically random
- [ ] JWT secret is 64+ characters
- [ ] No credentials in Docker logs
- [ ] No credentials in version control
- [ ] Backup encrypted if stored
- [ ] File owned by application user only

## 🔧 Troubleshooting

### Permission Denied Errors
```bash
# Fix file permissions
chmod 600 .env.production
chown $USER:$USER .env.production
```

### Tesla OAuth Errors
```bash
# Verify credentials format
grep "TESLA_CLIENT_ID" .env.production | wc -c  # Should be 20+ chars
grep "TESLA_CLIENT_SECRET" .env.production | wc -c  # Should be 40+ chars

# Check Tesla Developer Portal settings match exactly:
# - Redirect URI: https://driveway-hub.app/auth/tesla/callback
```

### Environment Loading Issues  
```bash
# Test environment file syntax
docker-compose --env-file .env.production config >/dev/null && echo "✅ Valid" || echo "❌ Invalid syntax"
```

Your Tesla credentials are now securely configured for production! 🔒🚗