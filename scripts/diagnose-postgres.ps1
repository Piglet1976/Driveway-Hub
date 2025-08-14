# PostgreSQL Authentication Diagnostic Script
# This script helps diagnose PostgreSQL connection issues

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "PostgreSQL Authentication Diagnostic" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$EnvFile = ".env.production"

# Load environment variables
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^([^#=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Variable -Name $name -Value $value -Scope Script
        }
    }
    Write-Host "✅ Loaded environment from $EnvFile" -ForegroundColor Green
} else {
    Write-Host "❌ $EnvFile not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "1. Environment Variables Check:" -ForegroundColor Yellow
Write-Host "   DB_PASSWORD from .env: $DB_PASSWORD"
Write-Host "   POSTGRES_PASSWORD from .env: $POSTGRES_PASSWORD"

if ($DB_PASSWORD -eq $POSTGRES_PASSWORD) {
    Write-Host "   ✅ Passwords match in .env file" -ForegroundColor Green
} else {
    Write-Host "   ❌ Passwords don't match in .env file!" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. Docker Container Status:" -ForegroundColor Yellow
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "postgres|app"

Write-Host ""
Write-Host "3. Checking PostgreSQL container environment:" -ForegroundColor Yellow
$pgEnv = docker exec driveway-hub-postgres env | Select-String "POSTGRES_PASSWORD"
if ($pgEnv) {
    Write-Host "   PostgreSQL container POSTGRES_PASSWORD is set" -ForegroundColor Green
} else {
    Write-Host "   ❌ POSTGRES_PASSWORD not found in container!" -ForegroundColor Red
}

Write-Host ""
Write-Host "4. Testing direct PostgreSQL connection:" -ForegroundColor Yellow
Write-Host "   Attempting to connect with environment password..." -ForegroundColor Gray

# Test with psql directly
$testResult = docker exec driveway-hub-postgres psql -U postgres -c "SELECT 1;" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Can connect without password (trust authentication)" -ForegroundColor Green
} else {
    Write-Host "   ❌ Cannot connect without password" -ForegroundColor Red
}

# Test with PGPASSWORD
$env:PGPASSWORD = $DB_PASSWORD
$testResult2 = docker exec -e PGPASSWORD=$DB_PASSWORD driveway-hub-postgres psql -U postgres -c "SELECT 1;" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Can connect with .env password" -ForegroundColor Green
} else {
    Write-Host "   ❌ Cannot connect with .env password" -ForegroundColor Red
}

Write-Host ""
Write-Host "5. Checking app container environment:" -ForegroundColor Yellow
$appEnv = docker exec driveway-hub-app env | Select-String "DB_PASSWORD"
if ($appEnv) {
    Write-Host "   App container DB_PASSWORD is set" -ForegroundColor Green
} else {
    Write-Host "   ❌ DB_PASSWORD not found in app container!" -ForegroundColor Red
}

Write-Host ""
Write-Host "6. Testing app to database connection:" -ForegroundColor Yellow
$testScript = @"
const { Pool } = require('pg');
console.log('Testing with config:');
console.log('  Host: postgres');
console.log('  Port: 5432');
console.log('  User: postgres');
console.log('  Database: $($DB_NAME ?? 'driveway_hub_dev')');
console.log('  Password: [HIDDEN]');

const pool = new Pool({
    host: 'postgres',
    port: 5432,
    database: '$($DB_NAME ?? 'driveway_hub_dev')',
    user: 'postgres',
    password: process.env.DB_PASSWORD
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
"@

docker compose --env-file $EnvFile exec -T app node -e $testScript 2>&1

Write-Host ""
Write-Host "7. PostgreSQL Authentication Method:" -ForegroundColor Yellow
$authMethod = docker exec driveway-hub-postgres psql -U postgres -c "SHOW password_encryption;" 2>&1
if ($authMethod -match "scram-sha-256|md5") {
    Write-Host "   Authentication method: $($matches[0])" -ForegroundColor Green
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Diagnosis Summary:" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Common Issues and Solutions:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. If passwords don't match in .env:" -ForegroundColor Cyan
Write-Host "   - Ensure DB_PASSWORD and POSTGRES_PASSWORD are the same"
Write-Host ""
Write-Host "2. If container can't connect with .env password:" -ForegroundColor Cyan
Write-Host "   - PostgreSQL was initialized with a different password"
Write-Host "   - Run: .\scripts\fix-postgres-auth.ps1"
Write-Host ""
Write-Host "3. If environment variables aren't set in containers:" -ForegroundColor Cyan
Write-Host "   - Restart with: docker compose --env-file .env.production up -d"
Write-Host ""
Write-Host "4. To manually fix in PostgreSQL:" -ForegroundColor Cyan
Write-Host "   docker exec -it driveway-hub-postgres psql -U postgres"
Write-Host "   ALTER USER postgres PASSWORD '$DB_PASSWORD';"
Write-Host "   \q"
Write-Host ""