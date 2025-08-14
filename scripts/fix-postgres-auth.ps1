# PostgreSQL Password Authentication Fix Script for Windows
# This script fixes the common Docker PostgreSQL password mismatch issue

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "PostgreSQL Authentication Fix" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will fix the PostgreSQL password authentication issue." -ForegroundColor Yellow
Write-Host "The problem occurs when PostgreSQL was initialized with a different password"
Write-Host "than what's currently in your .env.production file."
Write-Host ""

# Configuration
$EnvFile = ".env.production"
$ProjectName = "driveway-hub"

# Check if .env.production exists
if (!(Test-Path $EnvFile)) {
    Write-Host "Error: $EnvFile not found!" -ForegroundColor Red
    exit 1
}

# Load environment variables from .env.production
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Variable -Name $name -Value $value -Scope Script
    }
}

Write-Host "Current configuration:" -ForegroundColor Green
Write-Host "  DB_USER: $($DB_USER ?? 'postgres')"
Write-Host "  DB_PASSWORD: $DB_PASSWORD"
Write-Host "  DB_NAME: $($DB_NAME ?? 'driveway_hub_dev')"
Write-Host ""

# Ask for confirmation
$confirmation = Read-Host "Do you want to proceed with fixing the PostgreSQL authentication? (y/n)"
if ($confirmation -ne 'y') {
    Write-Host "Aborted." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Solution 1: Update password in running container" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check if postgres container is running
$postgresContainer = docker ps --format "table {{.Names}}" | Select-String "$ProjectName-postgres"

if ($postgresContainer) {
    Write-Host "PostgreSQL container is running. Updating password..." -ForegroundColor Yellow
    
    # Update the postgres user password
    $alterCmd = "ALTER USER postgres PASSWORD '$DB_PASSWORD';"
    docker exec "$ProjectName-postgres" psql -U postgres -c $alterCmd 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Password updated successfully in running container!" -ForegroundColor Green
        
        # Restart app container
        Write-Host "Restarting app container..." -ForegroundColor Yellow
        docker compose --env-file $EnvFile restart app
        
        Write-Host "✅ App container restarted. Testing connection..." -ForegroundColor Green
        Start-Sleep -Seconds 5
        
        # Test the connection
        $testScript = @"
const { Pool } = require('pg');
const pool = new Pool({
    host: 'postgres',
    port: 5432,
    database: '$($DB_NAME ?? 'driveway_hub_dev')',
    user: '$($DB_USER ?? 'postgres')',
    password: '$DB_PASSWORD'
});
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Connection failed:', err.message);
        process.exit(1);
    } else {
        console.log('Connection successful! Time:', res.rows[0].now);
        process.exit(0);
    }
});
"@
        
        docker compose --env-file $EnvFile exec -T app node -e $testScript 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database connection successful! Problem fixed." -ForegroundColor Green
            exit 0
        } else {
            Write-Host "⚠️ Connection test failed. Trying Solution 2..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️ Could not update password in running container. Trying Solution 2..." -ForegroundColor Yellow
    }
} else {
    Write-Host "PostgreSQL container not running. Starting Solution 2..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Solution 2: Reset PostgreSQL data volume" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "WARNING: This will delete all existing database data!" -ForegroundColor Red
Write-Host "You will need to recreate users and restore data afterwards." -ForegroundColor Yellow
Write-Host ""

$resetConfirmation = Read-Host "Do you want to proceed with resetting the PostgreSQL volume? (y/n)"
if ($resetConfirmation -ne 'y') {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "Solution 3: Manual password update" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    
    Write-Host "You can manually fix this by:" -ForegroundColor Yellow
    Write-Host "1. Connect to the PostgreSQL container:"
    Write-Host "   docker exec -it $ProjectName-postgres psql -U postgres" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Run this SQL command:"
    Write-Host "   ALTER USER postgres PASSWORD '$DB_PASSWORD';" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Exit psql (\q) and restart the app container:"
    Write-Host "   docker compose --env-file $EnvFile restart app" -ForegroundColor Cyan
    
    exit 0
}

Write-Host ""
Write-Host "Stopping all containers..." -ForegroundColor Yellow
docker compose --env-file $EnvFile down

Write-Host "Removing PostgreSQL data volume..." -ForegroundColor Yellow
docker volume rm "${ProjectName}_postgres_data" 2>$null
docker volume rm "postgres_data" 2>$null

Write-Host "Starting containers with fresh PostgreSQL instance..." -ForegroundColor Yellow
docker compose --env-file $EnvFile up -d postgres

Write-Host "Waiting for PostgreSQL to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "Starting app container..." -ForegroundColor Yellow
docker compose --env-file $EnvFile up -d app

Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Test the connection
Write-Host "Testing database connection..." -ForegroundColor Yellow
$testScript = @"
const { Pool } = require('pg');
const pool = new Pool({
    host: 'postgres',
    port: 5432,
    database: '$($DB_NAME ?? 'driveway_hub_dev')',
    user: '$($DB_USER ?? 'postgres')',
    password: '$DB_PASSWORD'
});
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Connection failed:', err.message);
        process.exit(1);
    } else {
        console.log('Connection successful! Time:', res.rows[0].now);
        process.exit(0);
    }
});
"@

docker compose --env-file $EnvFile exec -T app node -e $testScript 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database connection successful! Problem fixed." -ForegroundColor Green
    Write-Host ""
    Write-Host "Note: Database has been reset. You'll need to:" -ForegroundColor Yellow
    Write-Host "1. Run schema migrations"
    Write-Host "2. Restore any data backups"
    Write-Host "3. Create test users"
} else {
    Write-Host "❌ Connection still failing. Please check your configuration." -ForegroundColor Red
    Write-Host ""
    Write-Host "Debugging steps:" -ForegroundColor Yellow
    Write-Host "1. Check if containers are running: docker ps"
    Write-Host "2. Check container logs: docker logs $ProjectName-postgres"
    Write-Host "3. Check app logs: docker logs $ProjectName-app"
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Fix attempt complete!" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan